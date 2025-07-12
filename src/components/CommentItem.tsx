import { useState } from "react";
import { supabase } from "../supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useAuth from "../context/AuthContext";

// Define the Comment interface
interface Comment {
    id: number;
    content: string;
    post_id: number;
    parent_comment_id: number | null;
    user_id: string;
    created_at: string;
    author: string;
    children?: Comment[];
}

interface Props {
    comment: Comment;
    postId: number;
}

const createReply = async (
    replyContent: string, 
    postId: number, 
    parentCommentId: number, 
    userId?: string, 
    author?: string
) => {
    if (!userId || !author) {
        throw new Error("You must be logged in to reply");
    }

    const { error } = await supabase.from("comments").insert({
        content: replyContent,
        post_id: postId,
        parent_comment_id: parentCommentId,
        user_id: userId,
        author: author,
    });

    if (error) {
        throw new Error(error.message);
    }
};

export const CommentItem = ({ comment, postId }: Props) => {
    const [showReply, setShowReply] = useState<boolean>(false);
    const [replyText, setReplyText] = useState<string>("");
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { mutate, isPending, isError } = useMutation({
        mutationFn: (replyContent: string) => 
            createReply(replyContent, postId, comment.id, user?.id, user?.user_metadata?.user_name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            setReplyText("");
            setShowReply(false);
        }
    });

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText) return;
        mutate(replyText);
    };

    return (
        <div className="pl-4 border-l border-white/10">
            <div className="mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-blue-400">{comment.author}</span>
                    <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                    </span>
                </div>
                <p className="text-gray-300">{comment.content}</p>
                <button 
                    onClick={() => setShowReply((prev) => !prev)} 
                    className="text-blue-500 text-sm mt-1"
                >
                    {showReply ? "Cancel" : "Reply"}
                </button>
            </div>

            {showReply && user && (
                <form onSubmit={handleReplySubmit} className="mb-2">
                    <textarea 
                        value={replyText} 
                        rows={2} 
                        className="w-full border border-white/10 bg-transparent p-2 rounded" 
                        placeholder="Write a reply..." 
                        onChange={(e) => setReplyText(e.target.value)} 
                    />
                    <button 
                        type="submit" 
                        className="mt-1 bg-blue-500 text-white px-3 py-1 rounded"
                        disabled={isPending}
                    >
                        {isPending ? "Posting..." : "Post Reply"}
                    </button>
                    {isError && <p className="text-red-500">Error posting reply</p>}
                </form>
            )}

            {comment.children && comment.children.length > 0 && (
                <div className="ml-4">
                    <button 
                        onClick={() => setIsCollapsed((prev) => !prev)} 
                        title={isCollapsed ? "Show Replies" : "Hide Replies"}
                        className="text-gray-400 hover:text-gray-300"
                    >
                        {isCollapsed ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 15l7-7 7 7"
                                />
                            </svg>
                        )}
                        <span className="ml-1 text-xs">
                            {comment.children.length} {comment.children.length === 1 ? 'reply' : 'replies'}
                        </span>
                    </button>
                    {!isCollapsed && (
                        <div className="space-y-2">
                            {comment.children.map((child) => (
                                <CommentItem 
                                    key={child.id}  // Use child.id instead of array index
                                    comment={child} 
                                    postId={postId} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};