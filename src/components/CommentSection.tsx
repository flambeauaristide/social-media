import { useState } from "react";
import useAuth from "../context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Added useQueryClient
import { supabase } from "../supabase-client";
import { CommentItem } from "./CommentItem";

interface Props {
    postId: number;
}

interface NewComment {
    content: string;
    parent_comment_id?: number | null;
}

export interface PostComment {
    id: number;
    content: string;
    post_id: number;
    parent_comment_id: number | null;
    user_id: string;
    created_at: string;
    author: string;
}

// Extended type for comment tree
interface CommentWithChildren extends PostComment {
    children?: CommentWithChildren[];
}

const createComment = async (newComment: NewComment, postId: number, userId?: string, author?: string) => {
    if (!userId || !author) {
        throw new Error("You must be logged in to comment");
    }

    const { error } = await supabase.from("comments").insert({
        content: newComment.content,
        post_id: postId,
        parent_comment_id: newComment.parent_comment_id || null,
        user_id: userId,
        author: author,
    });

    if (error) {
        throw new Error(error.message);
    }
};

const fetchComments = async (postId: number): Promise<PostComment[]> => {
    const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return data as PostComment[];
};

export const CommentSection = ({ postId }: Props) => {
    const [newCommentText, setNewCommentText] = useState<string>("");
    const { user } = useAuth();
    const queryClient = useQueryClient(); // For refetching comments after mutation

    const { data: comments, isLoading, error } = useQuery<PostComment[], Error>({
        queryKey: ["comments", postId],
        queryFn: () => fetchComments(postId),
        refetchInterval: 5000,
    });

    const { mutate, isPending, isError } = useMutation({
        mutationFn: (newComment: NewComment) => createComment(newComment, postId, user?.id, user?.user_metadata?.user_name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] }); // Refetch comments after posting
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText) return;
        mutate({ content: newCommentText, parent_comment_id: null });
        setNewCommentText("");
    };

    // Updated to use PostComment and correct typing
    const buildCommentTree = (flatComments: PostComment[]): CommentWithChildren[] => {
        const map = new Map<number, CommentWithChildren>();
        const roots: CommentWithChildren[] = [];

        flatComments.forEach((comment) => {
            map.set(comment.id, { ...comment, children: [] });
        });

        flatComments.forEach((comment) => {
            if (comment.parent_comment_id) {
                const parent = map.get(comment.parent_comment_id);
                if (parent) {
                    parent.children!.push(map.get(comment.id)!);
                }
            } else {
                roots.push(map.get(comment.id)!);
            }
        });

        return roots;
    };

    if (isLoading) {
        return <div>Loading comments...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    const commentTree = comments ? buildCommentTree(comments) : [];

    return (
        <div className="mt-6">
            <h3 className="text-2xl font-semibold mb-4">Comments</h3>

            {/* Create comment section */}
            {user ? (
                <form onSubmit={handleSubmit} className="mb-4">
                    <textarea
                        value={newCommentText}
                        rows={3}
                        className="w-full border border-white/10 bg-transparent p-2 rounded"
                        placeholder="Write a comment..."
                        onChange={(e) => setNewCommentText(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="mt-2 bg-purple-500 text-white px-4 py-2 rounded cursor-pointer"
                        disabled={isPending}
                    >
                        {isPending ? "Posting..." : "Post Comment"}
                    </button>
                    {isError && <p className="text-red-500 mt-2">Error posting comment</p>}
                </form>
            ) : (
                <p className="mb-4 text-gray-600">You must be logged in to post a comment</p>
            )}

            {/* Comment display section */}
            <div className="space-y-4">
                {commentTree.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={postId} />
                ))}
            </div>
        </div>
    );
};