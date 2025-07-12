import { useState } from "react";
import { supabase } from "../supabase-client";
import { useMutation } from "@tanstack/react-query";
import useAuth from "../context/AuthContext";


interface Props {
    comment: Comment & {
        children?: Comment[];
    };
    postId: number;
}

const createREply = async (replyContent: string, postId: number, parentCommentId: number, userId?: string, author?: string) => {
    if (!userId || !author) {
            throw new Error("You must be logged in to reply");
        }
    
        const { error } = await supabase.from("comments").insert({
            content: replyContent,
            post_id: postId,
            parent_comment_id: parentCommentId, // Set parent_comment_id to null if it's not provided: userId,
            user_id: userId,
            author: author,
        })
    
        if (error) {
            throw new Error(error.message);
        }
}

export const CommentItem = ({ comment, postId }: Props) => {
    const [showReply, setShowReply] = useState<boolean>(false);
    const [replyText, setReplyText] = useState<string>("");
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    const { user } = useAuth();

    const {mutate, isPending, isError} = useMutation({
        mutationFn: (replyContent: string) => createREply(replyContent, postId, comment.id, user?.id, user?.user_metadata?.user_name),
    });

    const handleReplySubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!replyText) return

        mutate(replyText)

        setReplyText(""); // Clear the input after submission
    }
    return <div className="pl-4 border-l border-white/10">
        <div className="mb-2">
            <div className="flex items-center space-x-2">
                {/* Display the commenters username */}
                <span className="text-sm font-bold text-blue-400">{comment.author}</span>
                <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <p className="text-gray-300">{comment.content}</p>
            <button onClick={() => setShowReply((prev) => !prev)} className="text-blue-500 text-sm mt-1">{showReply ? "Cancel" : "Reply"}</button>
        </div>

        {showReply && user && (
            <form onSubmit={handleReplySubmit} className="mb-2">
                <textarea value={replyText} rows={2} className="w-full border border-white/10 bg-transparent p-2 rounded" placeholder="Write a reply..." onChange={(e) => setReplyText(e.target.value)} />
                <button type="submit" className="mt-1 bg-blue-500 text-white px-3 py-1 rounded">{isPending ? "Posting..." : "Post Reply"}</button>
                {isError && <p className="text-red-500">Error posting reply</p>}
            </form>
        )}

        {comment.children && comment.children.length > 0 && (
            <div className="ml-4">
                <button onClick={() => setIsCollapsed((prev) => !prev)} title={isCollapsed ? "Hide Replies" : "Show Replies"}>{isCollapsed ? (
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
                </button>
                {!isCollapsed && (
                    <div className="space-y-2">
                        {comment.children.map((child, key) => (
                            <CommentItem key={key} comment={child} postId={postId} />
                        ))}
                    </div>
                )}
            </div>
        )}

    </div>
}