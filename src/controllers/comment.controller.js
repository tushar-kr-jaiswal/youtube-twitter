import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.exists({ _id: videoId });

    if (!video) {
        throw new ApiError(404, "The requested video was not found.");
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
        throw new ApiError(400, "Invalid pagination parameters");
    }

    const pipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $project: {
                content: 1,
                likedBy: 1,
                owner: {
                    username: "$ownerDetails.username",
                    avatarUrl: "$ownerDetails.avatar.url",
                },
                createdAt: 1,
            },
        },
    ];

    const options = {
        page: pageNum,
        limit: limitNum,
    };

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate(pipeline),
        options
    );

    if (!comments || comments?.docs.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "No comments available for this video."
                )
            );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format.");
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required.");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(
            404,
            "The video you are trying to comment on was not found."
        );
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(
            500,
            "An unexpected error occurred while adding the comment."
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment addeed successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format.");
    }

    if (!content) {
        throw new ApiError(400, "Updated comment content is required.");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(
            404,
            "The comment you are trying to update was not found."
        );
    }

    if (comment?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to edit this comment.");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(
            500,
            "An unexpected error occurred while updating the comment."
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment edited successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format.");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(
            404,
            "The comment you are trying to delete was not found."
        );
    }

    if (comment?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to delete this comment."
        );
    }

    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, commentId, "Comment deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
