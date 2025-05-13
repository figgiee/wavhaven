import React, { useState, useEffect, useTransition } from 'react';
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
            const result = await addComment({ trackId: beatId, text: replyText.trim(), parentId });
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

const MAX_COMMENTS_INITIAL = 5;

export const CommentsSection: React.FC<CommentsSectionProps> = ({ beatId }) => {
    const { userId: clerkUserId, isSignedIn } = useAuth();
    const [comments, setComments] = useState<CommentWithDetails[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startTransition] = useTransition();
    const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID of comment being replied to

    useEffect(() => {
        if (!beatId) return;

        const fetchComments = async () => {
            setIsLoading(true);
            setError(null);
            // Fetch comments using the updated action/type
            const result = await getCommentsForTrack(beatId);
            if (result.success && result.comments) {
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
            const result = await addComment({ trackId: beatId, text: newComment.trim() });

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

    // Handler called when a reply is successfully submitted via ReplyForm
    const handleReplySuccess = (newReply: CommentWithDetails) => {
        setComments(prevComments =>
            prevComments.map(comment => {
                // If the current comment is the parent of the new reply
                if (comment.id === newReply.parentId) {
                    return {
                        ...comment,
                        replies: [...(comment.replies || []), newReply].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                    };
                } else if (comment.replies && comment.replies.some(reply => reply.id === newReply.parentId)) {
                    // If the new reply is a reply to one of the existing replies (nested reply)
                    return {
                        ...comment,
                        replies: comment.replies.map(reply =>
                            reply.id === newReply.parentId
                                ? { ...reply, replies: [...(reply.replies || []), newReply].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }
                                : reply
                        ),
                    };
                }
                return comment;
            })
        );
        setReplyingTo(null);
    };

    // Helper to get initials from name
    const getInitials = (name?: string | null): string => {
        if (!name) return '?';
        // Handle potential multiple spaces
        const nameParts = name.trim().split(/\s+/);
        return nameParts.map(n => n[0]).slice(0, 2).join('').toUpperCase();
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
                                                {comment.text}
                                            </p>
                                            {/* Like/Reply/Delete Actions */} 
                                            <div className="flex items-center pt-1 space-x-3">
                                                {/* TODO: Add Like Button Here */} 
                                                {isSignedIn && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="xs" 
                                                        className="text-muted-foreground hover:text-primary p-0 h-auto"
                                                        onClick={() => setReplyingTo(comment.id)}
                                                        disabled={replyingTo === comment.id} // Disable if already replying
                                                    >
                                                        <CornerDownRight className="w-3 h-3 mr-1"/>
                                                        Reply
                                                    </Button>
                                                )}
                                                {/* TODO: Add Delete Button Here */} 
                                            </div>
                                        </div>
                                    </div>
                                     {/* Reply Form - Conditionally Rendered */} 
                                     {replyingTo === comment.id && (
                                        <ReplyForm
                                            beatId={beatId}
                                            parentId={comment.id}
                                            onReplySuccess={handleReplySuccess}
                                            onCancel={() => setReplyingTo(null)} // Add cancel handler
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </CardContent>
            {/* Footer with Top-Level Comment Form */}
            <CardFooter className="border-t border-[hsl(var(--border))]/50 p-4">
                {isSignedIn ? (
                    <form onSubmit={handleAddComment} className="w-full space-y-2">
                        <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
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