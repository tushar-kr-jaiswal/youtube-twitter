import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet please try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet created Successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1,
            },
        },
    ]);
    if (tweets.length < 1) {
        return res
            .status(200)
            .json(new ApiResponse(200, tweets, "Tweets are not available"));
    }
    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched Successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const { tweetId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    if (!tweetId) {
        throw new ApiError(400, "TweetId is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(400, "Tweet not found");
    }

    if (tweet?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You cannot update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Something went wrong while updating tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Tweet Updated Successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid TweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    // console.log(t?.owner?.toString() === req.user?._id.toString());

    if (!tweet) {
        throw new ApiError(404, "Tweet not Found");
    }

    if (tweet?.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Unauthorized request");
    }

    await Tweet.findByIdAndDelete(tweetId);

    const checkTweet = await Tweet.findById(tweetId);

    if (checkTweet !== null) {
        throw new ApiError(500, "Unable to delte the tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted Successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
