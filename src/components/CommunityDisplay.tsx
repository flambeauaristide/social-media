import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase-client";
import { PostItem } from "./PostItem";

interface Props {
    communityId: number;
}

// Define the Post interface if not imported from elsewhere
interface Post {
    id: number;
    title: string;
    content: string;
    created_at: string;
    community_id: number;
    image_url: string;
    avatar_url?: string;
    like_count?: number;
    comment_count?: number;
    // Add other fields as needed
}

interface PostWithCommunity extends Post {
    communities: {
        name: string;
    };
}

export const fetchCommunityPost = async (communityId: number): Promise<PostWithCommunity[]> => {
    const {data, error} = await supabase.from("posts").select("*, communities(name)").eq("community_id", communityId).order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data as PostWithCommunity[];
}

export const CommunityDisplay = ({communityId}: Props) => {
    const {data, error, isLoading} = useQuery<PostWithCommunity[], Error>({
        queryKey: ["communityPost", communityId], 
        queryFn: () => fetchCommunityPost(communityId)
    });

    if (isLoading) return <div className="text-center py-4">Loading communities...</div>;
    if (error) return <div className="text-center text-red-500 py-4">Error: {error.message}</div>;
    
    return (
        <div>
            <h2 className="text-6xl font-bold mb-6 text-center bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                {data && data.length > 0 ? `${data[0].communities.name} Community Posts` : "Community Posts"}
            </h2>

            {data && data.length > 0 ? (
                <div className="flex flex-wrap gap-6 justify-center">
                    {data.map((post, key) => (<PostItem post={post} key={key} />))}
                </div>
            ) : (
                <p className="text-center text-gray-400">No posts in this community yet.</p>
            )}
        </div>
    );
}