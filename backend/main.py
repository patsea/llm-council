"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
from datetime import datetime

from . import storage, config
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings

app = FastAPI(title="LLM Council API")

# Global state for startup validation
_startup_validation_result = None

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Run model validation on startup."""
    global _startup_validation_result
    _startup_validation_result = await config.validate_configured_models()

    if not _startup_validation_result["valid"]:
        print("=" * 60)
        print("WARNING: Model validation errors detected!")
        for error in _startup_validation_result["errors"]:
            print(f"  - {error}")
        print("=" * 60)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


class ModelConfigRequest(BaseModel):
    """Request to update model configuration."""
    council_models: List[str]
    chairman_model: str


class SearchConversationsRequest(BaseModel):
    """Request to search conversations."""
    query: str


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/system/health")
async def get_system_health():
    """Get system health including model validation status."""
    return {
        "status": "healthy" if _startup_validation_result and _startup_validation_result["valid"] else "degraded",
        "model_validation": _startup_validation_result
    }


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Collect responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_data = await stage1_collect_responses(request.content)
            stage1_results = stage1_data["responses"]
            stage1_errors = stage1_data["errors"]
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_data})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            stage1_cost = sum(r.get('cost', 0) for r in stage1_results)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings, 'stage1_cost': stage1_cost, 'stage1_errors': stage1_errors}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.get("/api/models/available")
async def get_available_models():
    """Get all available models from OpenRouter API.

    Raises:
        HTTPException: 503 if OpenRouter API is unavailable.
    """
    try:
        models = await config.fetch_openrouter_models()
        return models
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to fetch models from OpenRouter API. Please check your API key and try again. Error: {str(e)}"
        )


@app.get("/api/models/config")
async def get_model_config():
    """Get current model configuration."""
    model_config = config.load_model_config()
    return {
        "council_models": model_config["council_models"],
        "chairman_model": model_config["chairman_model"]
    }


@app.put("/api/models/config")
async def update_model_config(request: ModelConfigRequest):
    """Update model configuration.

    Validates all models against OpenRouter API to ensure they are available.
    """
    # Get models from OpenRouter API (no fallback)
    try:
        available = await config.fetch_openrouter_models()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to validate models against OpenRouter API. Please check your API key and try again. Error: {str(e)}"
        )

    # Build list of valid model IDs and model info for suggestions
    all_models = []
    model_info = {}
    for provider, provider_models in available.items():
        for model in provider_models:
            all_models.append(model["id"])
            model_info[model["id"]] = {
                "name": model["name"],
                "provider": provider
            }

    # Validate council models
    invalid_council_models = []
    for model in request.council_models:
        if model not in all_models:
            invalid_council_models.append(model)

    if invalid_council_models:
        # Find similar models as suggestions
        suggestions = []
        for invalid_model in invalid_council_models:
            # Try to find models from the same provider
            if "/" in invalid_model:
                provider_prefix = invalid_model.split("/")[0]
                similar = [m for m in all_models if m.startswith(provider_prefix + "/")][:3]
                if similar:
                    suggestions.extend(similar)

        suggestion_text = ""
        if suggestions:
            suggestion_text = f"\n\nValid alternatives from OpenRouter:\n" + "\n".join([f"  - {s}" for s in suggestions[:5]])

        raise HTTPException(
            status_code=400,
            detail=f"Invalid council model(s): {', '.join(invalid_council_models)}.{suggestion_text}\n\nPlease select models from the dropdown in Model Configuration."
        )

    # Validate chairman model
    if request.chairman_model not in all_models:
        # Find similar models as suggestions
        suggestions = []
        if "/" in request.chairman_model:
            provider_prefix = request.chairman_model.split("/")[0]
            similar = [m for m in all_models if m.startswith(provider_prefix + "/")][:3]
            if similar:
                suggestions = similar

        suggestion_text = ""
        if suggestions:
            suggestion_text = f"\n\nValid alternatives from OpenRouter:\n" + "\n".join([f"  - {s}" for s in suggestions])

        raise HTTPException(
            status_code=400,
            detail=f"Invalid chairman model: {request.chairman_model}.{suggestion_text}\n\nPlease select a model from the dropdown in Model Configuration."
        )

    # Save configuration
    new_config = {
        "council_models": request.council_models,
        "chairman_model": request.chairman_model
    }
    config.save_model_config(new_config)

    return {"status": "success", "config": new_config}


@app.get("/api/conversations/{conversation_id}/export/{format}")
async def export_conversation(conversation_id: str, format: str):
    """Export a conversation in markdown or JSON format."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if format == "json":
        return JSONResponse(
            content=conversation,
            headers={
                "Content-Disposition": f"attachment; filename=conversation-{conversation_id}.json"
            }
        )
    elif format == "markdown":
        md_content = f"# {conversation['title']}\n\n"
        md_content += f"Created: {conversation['created_at']}\n\n"
        md_content += "---\n\n"

        for i, msg in enumerate(conversation["messages"]):
            if msg["role"] == "user":
                md_content += f"## User Message {i//2 + 1}\n\n"
                md_content += f"{msg['content']}\n\n"
            elif msg["role"] == "assistant":
                md_content += f"## Council Response {i//2 + 1}\n\n"

                # Stage 1
                if "stage1" in msg:
                    md_content += "### Stage 1: Individual Responses\n\n"
                    for resp in msg["stage1"]:
                        md_content += f"**{resp['model']}:**\n\n{resp['response']}\n\n"

                # Stage 2
                if "stage2" in msg:
                    md_content += "### Stage 2: Rankings\n\n"
                    for ranking in msg["stage2"]:
                        md_content += f"**{ranking['model']}:**\n\n{ranking['ranking']}\n\n"

                # Stage 3
                if "stage3" in msg:
                    md_content += "### Stage 3: Final Synthesis\n\n"
                    md_content += f"**{msg['stage3']['model']}:**\n\n{msg['stage3']['response']}\n\n"

                md_content += "---\n\n"

        return PlainTextResponse(
            content=md_content,
            headers={
                "Content-Disposition": f"attachment; filename=conversation-{conversation_id}.md"
            }
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'json' or 'markdown'")


@app.get("/api/analytics/metrics")
async def get_analytics_metrics():
    """Get analytics metrics for model performance over time."""
    conversations = storage.list_conversations()

    # Collect all responses and rankings
    model_stats = {}
    total_conversations = 0

    for conv_meta in conversations:
        conv = storage.get_conversation(conv_meta["id"])
        if not conv:
            continue

        for msg in conv["messages"]:
            if msg["role"] == "assistant":
                total_conversations += 1

                # Count stage1 responses
                if "stage1" in msg:
                    for resp in msg["stage1"]:
                        model = resp["model"]
                        if model not in model_stats:
                            model_stats[model] = {
                                "model": model,
                                "response_count": 0,
                                "total_rank_score": 0,
                                "rank_count": 0,
                                "average_rank": 0
                            }
                        model_stats[model]["response_count"] += 1

                # Process stage2 rankings
                if "stage2" in msg and "stage1" in msg:
                    # Create label to model mapping
                    labels = [chr(65 + i) for i in range(len(msg["stage1"]))]
                    label_to_model = {
                        f"Response {label}": result['model']
                        for label, result in zip(labels, msg["stage1"])
                    }

                    # Parse rankings
                    for ranking in msg["stage2"]:
                        from .council import parse_ranking_from_text
                        parsed = parse_ranking_from_text(ranking["ranking"])

                        for position, label in enumerate(parsed, start=1):
                            if label in label_to_model:
                                model = label_to_model[label]
                                if model in model_stats:
                                    model_stats[model]["total_rank_score"] += position
                                    model_stats[model]["rank_count"] += 1

    # Calculate averages
    for model in model_stats.values():
        if model["rank_count"] > 0:
            model["average_rank"] = round(model["total_rank_score"] / model["rank_count"], 2)

    # Convert to list and sort by average rank (lower is better)
    metrics = list(model_stats.values())
    metrics.sort(key=lambda x: x["average_rank"] if x["average_rank"] > 0 else float('inf'))

    return {
        "total_conversations": total_conversations,
        "model_metrics": metrics
    }


@app.get("/api/analytics/costs")
async def get_cost_analytics():
    """Get cost analytics across all conversations."""
    import os
    from pathlib import Path

    conversations_dir = Path("data/conversations")

    total_cost = 0
    cost_by_model = {}
    cost_by_stage = {"stage1": 0, "stage2": 0, "stage3": 0}
    conversation_costs = []

    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)

            conv_cost = 0
            for msg in conv.get("messages", []):
                if msg.get("role") == "assistant":
                    # Stage 1 costs
                    for r in msg.get("stage1", []):
                        cost = r.get("cost", 0)
                        model = r.get("model", "unknown")
                        total_cost += cost
                        conv_cost += cost
                        cost_by_stage["stage1"] += cost
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost

                    # Stage 2 costs
                    for r in msg.get("stage2", []):
                        cost = r.get("cost", 0)
                        model = r.get("model", "unknown")
                        total_cost += cost
                        conv_cost += cost
                        cost_by_stage["stage2"] += cost
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost

                    # Stage 3 cost
                    stage3 = msg.get("stage3", {})
                    cost = stage3.get("cost", 0)
                    model = stage3.get("model", "unknown")
                    total_cost += cost
                    conv_cost += cost
                    cost_by_stage["stage3"] += cost
                    if model != "unknown":
                        cost_by_model[model] = cost_by_model.get(model, 0) + cost

            if conv_cost > 0:
                conversation_costs.append({
                    "id": conv.get("id"),
                    "title": conv.get("title", "Untitled"),
                    "cost": conv_cost,
                    "created_at": conv.get("created_at")
                })
        except Exception as e:
            continue

    # Sort by cost descending
    cost_by_model_sorted = sorted(cost_by_model.items(), key=lambda x: x[1], reverse=True)
    conversation_costs.sort(key=lambda x: x["cost"], reverse=True)

    return {
        "total_cost": round(total_cost, 4),
        "cost_by_model": [{"model": m, "cost": round(c, 4)} for m, c in cost_by_model_sorted],
        "cost_by_stage": {k: round(v, 4) for k, v in cost_by_stage.items()},
        "top_conversations": conversation_costs[:10],
        "conversation_count": len(conversation_costs)
    }


@app.get("/api/analytics/performance")
async def get_performance_analytics():
    """Get token and performance analytics across all conversations."""
    import os
    from pathlib import Path

    conversations_dir = Path("data/conversations")

    total_tokens = 0
    tokens_by_model = {}
    response_times = {}
    errors_by_model = {}

    for conv_file in conversations_dir.glob("*.json"):
        try:
            with open(conv_file) as f:
                conv = json.load(f)

            for msg in conv.get("messages", []):
                if msg.get("role") == "assistant":
                    # Stage 1
                    for r in msg.get("stage1", []):
                        model = r.get("model", "unknown")
                        prompt = r.get("tokens_prompt", 0)
                        completion = r.get("tokens_completion", 0)
                        time = r.get("response_time", 0)

                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion

                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)

                    # Stage 2
                    for r in msg.get("stage2", []):
                        model = r.get("model", "unknown")
                        prompt = r.get("tokens_prompt", 0)
                        completion = r.get("tokens_completion", 0)
                        time = r.get("response_time", 0)

                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion

                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)

                    # Stage 3
                    stage3 = msg.get("stage3", {})
                    model = stage3.get("model", "unknown")
                    prompt = stage3.get("tokens_prompt", 0)
                    completion = stage3.get("tokens_completion", 0)
                    time = stage3.get("response_time", 0)

                    if model != "unknown":
                        total_tokens += prompt + completion
                        if model not in tokens_by_model:
                            tokens_by_model[model] = {"prompt": 0, "completion": 0, "total": 0}
                        tokens_by_model[model]["prompt"] += prompt
                        tokens_by_model[model]["completion"] += completion
                        tokens_by_model[model]["total"] += prompt + completion

                        if time > 0:
                            if model not in response_times:
                                response_times[model] = []
                            response_times[model].append(time)

                    # Errors
                    for err in msg.get("metadata", {}).get("stage1_errors", []):
                        model = err.get("model", "unknown")
                        if model not in errors_by_model:
                            errors_by_model[model] = 0
                        errors_by_model[model] += 1

        except Exception:
            continue

    # Calculate averages
    avg_response_times = []
    for model, times in response_times.items():
        avg_response_times.append({
            "model": model,
            "avg_time": round(sum(times) / len(times), 2),
            "min_time": round(min(times), 2),
            "max_time": round(max(times), 2),
            "count": len(times)
        })
    avg_response_times.sort(key=lambda x: x["avg_time"])

    # Sort tokens by total
    tokens_sorted = sorted(tokens_by_model.items(), key=lambda x: x[1]["total"], reverse=True)

    return {
        "total_tokens": total_tokens,
        "tokens_by_model": [{"model": m, **t} for m, t in tokens_sorted],
        "response_times": avg_response_times,
        "errors_by_model": [{"model": m, "count": c} for m, c in sorted(errors_by_model.items(), key=lambda x: x[1], reverse=True)],
        "total_errors": sum(errors_by_model.values())
    }


@app.post("/api/conversations/search")
async def search_conversations(request: SearchConversationsRequest):
    """Search conversations by query string."""
    all_conversations = storage.list_conversations()
    query = request.query.lower()

    results = []

    for conv_meta in all_conversations:
        conv = storage.get_conversation(conv_meta["id"])
        if not conv:
            continue

        # Check if query matches title
        if query in conv["title"].lower():
            results.append({
                "id": conv["id"],
                "title": conv["title"],
                "created_at": conv["created_at"],
                "message_count": len(conv["messages"]),
                "match_location": "title"
            })
            continue

        # Check if query matches any message content
        for msg in conv["messages"]:
            if msg["role"] == "user":
                if query in msg["content"].lower():
                    results.append({
                        "id": conv["id"],
                        "title": conv["title"],
                        "created_at": conv["created_at"],
                        "message_count": len(conv["messages"]),
                        "match_location": "user_message"
                    })
                    break
            elif msg["role"] == "assistant":
                # Search in stage1 responses
                if "stage1" in msg:
                    for resp in msg["stage1"]:
                        if query in resp["response"].lower():
                            results.append({
                                "id": conv["id"],
                                "title": conv["title"],
                                "created_at": conv["created_at"],
                                "message_count": len(conv["messages"]),
                                "match_location": "assistant_response"
                            })
                            break
                    else:
                        continue
                    break

    return {"results": results, "count": len(results)}


@app.post("/api/conversations/{conversation_id}/retry-stage3")
async def retry_stage3(conversation_id: str):
    """Retry Stage 3 synthesis for a conversation that failed."""

    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Find the last assistant message
    last_message = None
    for msg in reversed(conversation["messages"]):
        if msg["role"] == "assistant":
            last_message = msg
            break

    if not last_message:
        raise HTTPException(status_code=400, detail="No assistant message found")

    if "stage1" not in last_message or "stage2" not in last_message:
        raise HTTPException(status_code=400, detail="Stage 1 or 2 data missing")

    # Check if stage3 actually failed
    stage3 = last_message.get("stage3", {})
    if not stage3.get("error") and "Error:" not in stage3.get("response", ""):
        raise HTTPException(status_code=400, detail="Stage 3 did not fail")

    # Get the original user question
    user_message = None
    for msg in conversation["messages"]:
        if msg["role"] == "user":
            user_message = msg["content"]

    if not user_message:
        raise HTTPException(status_code=400, detail="Original question not found")

    # Retry Stage 3
    stage3_result = await stage3_synthesize_final(
        user_message,
        last_message["stage1"],
        last_message["stage2"]
    )

    # Update the conversation
    storage.update_stage3(conversation_id, stage3_result)

    return {
        "status": "success" if not stage3_result.get("error") else "failed",
        "stage3": stage3_result
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
