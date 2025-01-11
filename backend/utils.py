async def update_db(result_id: str, question: str, response_text: str):
    result_id_obj = ObjectId(result_id)
    result = await main_db.results.find_one({"_id": result_id_obj})

    if not result:
        raise HTTPException(
            status_code=404, detail=f"Result with id {result_id} not found"
        )

    if "extraQuestions" not in result:
        result["extraQuestions"] = []
    result["extraQuestions"].append(
        {
            "question": question,
            "answer": response_text,
        }
    )
    update_result = await main_db.results.update_one(
        {"_id": result_id_obj},
        {"$set": {"extraQuestions": result["extraQuestions"]}},
    )
    if not update_result.matched_count:
        raise HTTPException(
            status_code=404,
            detail=f"Result with id {result_id} not found during update",
        )
    if not update_result.modified_count:
        raise HTTPException(
            status_code=400, detail=f"Result with id {result_id} not updated"
        )
