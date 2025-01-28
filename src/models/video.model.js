import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            url: {
                type: String,
                required: true,
            },
            public_id: {
                type: String,
                required: true,
            },
        },
        thumbnail: {
            url: {
                type: String,
                required: true,
            },
            public_id: {
                type: String,
                required: true,
            },
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number, // Cloudianry URL
            required: true,
        },
        views: {
            type: Number, // Cloudianry URL
            default: 0,
        },
        isPublished: {
            type: Boolean, // Cloudianry URL
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId, // Cloudianry URL
            ref: "User",
        },
    },
    { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
