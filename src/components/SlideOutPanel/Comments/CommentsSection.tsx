import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { AlertMessage } from '../AlertMessage'; // Assuming AlertMessage is usable
import { getCommentsForTrack, addComment, type CommentWithDetails } from '@/server-actions/commentActions';
import { Loader2, MessageSquare, CornerDownRight } from 'lucide-react';
import Link from 'next/link';

interface CommentsSectionProps {
    beatId: string; // Ensure beatId is always passed as string
}

const CommentItemSkeleton = () => (
    <div className="flex space-x-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/5" />
        </div>
    </div>
);

// Reply Form Component (Optional but cleaner)
interface ReplyFormProps {
    beatId: string;
    parentId: string;
    onReplySuccess: (newReply: CommentWithDetails) => void;
    onCancel: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ beatId, parentId, onReplySuccess, onCancel }) => {
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, startReplyTransition] = useTransition();

    const handleReplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        startReplyTransition(async () => {
            const result = await addComment({ trackId: beatId, content: replyText.trim(), parentId });
            if (result.success && result.comment) {
                toast.success('Reply posted!');
                onReplySuccess(result.comment); // Pass the new reply back up
                setReplyText(''); // Clear form
            } else {
                toast.error(result.error ?? 'Failed to post reply.');
            }
        });
    };

    return (
        <form onSubmit={handleReplySubmit} className="w-full space-y-2 mt-2 pl-10">
            <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="text-xs bg-background/60 focus:bg-background/80 resize-none"
                maxLength={1000}
                aria-label="Reply input"
            />
            <div className="flex justify-end gap-2">
                 <Button
                     type="button" // Important: prevent form submission
                     variant="ghost"
                     size="xs"
                     onClick={onCancel} // Call cancel handler
                 >
                     Cancel
                 </Button>
                 <Button
                     type="submit"
                     disabled={isSubmittingReply || !replyText.trim()}
                     size="xs"
                 >
                     {isSubmittingReply && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                     Reply
                 </Button>
            </div>
        </form>
    );
};

// Recursive Component for rendering comments and their replies
const CommentList: React.FC<{ comments: CommentWithDetails[]; onReplyClick: (id: string) => void; replyingTo: string | null; beatId: string; onReplySuccess: (reply: CommentWithDetails) => void }> = ({ comments, onReplyClick, replyingTo, beatId, onReplySuccess }) => {
    // Helper to get initials from name - can be moved outside if it's a pure function used elsewhere
    const getInitials = (name?: string | null): string => {
        if (!name) return '?';
        const nameParts = name.trim().split(/\s+/);
        return nameParts.map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <ul className="divide-y divide-border/30">
            {comments.map((comment) => (
                <li key={comment.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex space-x-3">
                        <Avatar className="h-9 w-9 border border-[hsl(var(--border))]/40 flex-shrink-0">
                            <AvatarImage src={(comment.user as any).imageUrl ?? undefined} alt={comment.user.username ?? comment.user.name ?? 'User'} />
                            <AvatarFallback className="text-xs">{getInitials(comment.user.name ?? comment.user.username)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium leading-none text-foreground">
                                    {comment.user.name ?? comment.user.username ?? 'Anonymous'}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                            <div className="flex items-center pt-1 space-x-3">
                                <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="text-muted-foreground hover:text-primary p-0 h-auto"
                                    onClick={() => onReplyClick(comment.id)}
                                    disabled={replyingTo === comment.id}
                                >
                                    <CornerDownRight className="w-3 h-3 mr-1"/>
                                    Reply
                                </Button>
                            </div>
                        </div>
                    </div>
                    {replyingTo === comment.id && (
                        <ReplyForm
                            beatId={beatId}
                            parentId={comment.id}
                            onReplySuccess={onReplySuccess}
                            onCancel={() => onReplyClick('')} // Pass an empty string or null to cancel
                        />
                    )}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-8 mt-2 border-l-2 border-border/20">
                            <CommentList 
                                comments={comment.replies} 
                                onReplyClick={onReplyClick} 
                                replyingTo={replyingTo}
                                beatId={beatId}
                                onReplySuccess={onReplySuccess}
                            />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};

const MAX_COMMENTS_INITIAL = 5;

export const CommentsSection: React.FC<CommentsSectionProps> = ({ beatId }) => {
    const { userId: clerkUserId, isSignedIn } = useAuth();
    const [comments, setComments] = useState<CommentWithDetails[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startTransition] = useTransition();
    const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID of comment being replied to
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!beatId) return;

        const fetchComments = async () => {
            setIsLoading(true);
            setError(null);
            // Fetch comments using the updated action/type
            const result = await getCommentsForTrack(beatId);
            if (result.success && result.comments !== undefined) {
                setComments(result.comments);
            } else {
                setError(result.error ?? 'Failed to load comments.');
                toast.error(result.error ?? 'Failed to load comments.');
            }
            setIsLoading(false);
        };

        fetchComments();
    }, [beatId]);

    // Handler for submitting TOP-LEVEL comments
    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isSignedIn || !newComment.trim()) return;

        startTransition(async () => {
            // Call addComment without parentId for top-level comments
            const result = await addComment({ trackId: beatId, content: newComment.trim() });

            if (result.success && result.comment) {
                setComments(prev => [result.comment!, ...prev]);
                setNewComment('');
                toast.success('Comment added!');
            } else {
                toast.error(result.error ?? 'Failed to add comment.');
                setError(result.error ?? 'Failed to add comment.');
            }
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line
            if (!isSubmitting && newComment.trim()) {
                formRef.current?.requestSubmit();
            }
        }
    };

    // Handler called when a reply is successfully submitted via ReplyForm
    const handleReplySuccess = (newReply: CommentWithDetails) => {
        // Add the new reply to the flat list of comments
        setComments(prevComments => [...prevComments, newReply]);
        setReplyingTo(null); // Close the reply form
    };

    // Helper to build a nested tree from a flat list of comments
    const buildCommentTree = (list: CommentWithDetails[]): CommentWithDetails[] => {
        const map: { [key: string]: CommentWithDetails } = {};
        const roots: CommentWithDetails[] = [];

        // First pass: create a map of all comments by their ID
        list.forEach(comment => {
            map[comment.id] = { ...comment, replies: [] };
        });

        // Second pass: build the tree structure
        list.forEach(comment => {
            if (comment.parentId && map[comment.parentId]) {
                // This is a reply, push it into its parent's replies array
                map[comment.parentId].replies?.push(map[comment.id]);
            } else {
                // This is a top-level comment
                roots.push(map[comment.id]);
            }
        });

        // Sort roots and all replies by creation date
        const sortByDate = (a: CommentWithDetails, b: CommentWithDetails) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        
        roots.sort(sortByDate);
        Object.values(map).forEach(comment => {
            if (comment.replies) {
                comment.replies.sort(sortByDate);
            }
        });


        return roots;
    };

    return (
        <Card className="bg-background/70 border-[hsl(var(--border))]/50 backdrop-blur-sm shadow-md">
            <CardHeader className="border-b border-[hsl(var(--border))]/50 pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    Comments
                    <span className="text-sm font-normal text-muted-foreground">
                        ({isLoading ? '...' : comments.length})
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                 <div className="space-y-4">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <CommentItemSkeleton key={i} />)
                    ) : error ? (
                        <AlertMessage variant="error" message={error} />
                    ) : comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
                    ) : (
                        <CommentList 
                            comments={buildCommentTree(comments)} 
                            onReplyClick={setReplyingTo}
                            replyingTo={replyingTo}
                            beatId={beatId}
                            onReplySuccess={handleReplySuccess}
                        />
                    )}
                </div>
            </CardContent>
            {/* Footer with Top-Level Comment Form */}
            <CardFooter className="border-t border-[hsl(var(--border))]/50 p-4">
                {isSignedIn ? (
                    <form ref={formRef} onSubmit={handleAddComment} className="w-full space-y-2">
                        <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                            className="text-xs bg-background/60 focus:bg-background/80 resize-none"
                            maxLength={1000}
                            aria-label="Comment input"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newComment.trim()}
                                size="xs" // Use smaller size if available/defined
                            >
                                {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                Post
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center w-full">
                        <p className="text-xs text-muted-foreground">
                            <Link href="/sign-in" className="text-primary hover:underline font-medium">Sign in</Link> or{' '}
                            <Link href="/sign-up" className="text-primary hover:underline font-medium">Sign up</Link> to comment.
                        </p>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}; 