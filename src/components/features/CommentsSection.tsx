'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCommentsForTrack, addComment, type CommentWithDetails } from '@/server-actions/commentActions';
import { Loader2, MessageSquare, CornerDownRight } from 'lucide-react';

interface CommentsSectionProps {
    trackId: string;
    title?: string; // Optional title for the section
    className?: string;
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

// Reply Form Component
interface ReplyFormProps {
    trackId: string;
    parentId: string;
    onReplySuccess: (newReply: CommentWithDetails) => void;
    onCancel: () => void;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ trackId, parentId, onReplySuccess, onCancel }) => {
    const [replyText, setReplyText] = useState('');
    const [isSubmittingReply, startReplyTransition] = useTransition();

    const handleReplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        startReplyTransition(async () => {
            const result = await addComment({ trackId, content: replyText.trim(), parentId });
            if (result.success && result.comment) {
                toast.success('Reply posted!');
                onReplySuccess(result.comment);
                setReplyText('');
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
                className="text-sm bg-background/60 focus:bg-background/80 resize-none"
                maxLength={1000}
                aria-label="Reply input"
            />
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmittingReply || !replyText.trim()}
                    size="sm"
                >
                    {isSubmittingReply && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Reply
                </Button>
            </div>
        </form>
    );
};

// Recursive Component for rendering comments and their replies
const CommentList: React.FC<{ 
    comments: CommentWithDetails[]; 
    onReplyClick: (id: string) => void; 
    replyingTo: string | null; 
    trackId: string; 
    onReplySuccess: (reply: CommentWithDetails) => void;
}> = ({ comments, onReplyClick, replyingTo, trackId, onReplySuccess }) => {
    const getInitials = (name?: string | null): string => {
        if (!name) return '?';
        const nameParts = name.trim().split(/\s+/);
        return nameParts.map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.id} className="group">
                    <div className="flex space-x-3">
                        <Avatar className="h-10 w-10 border border-border/40 flex-shrink-0">
                            <AvatarImage 
                                src={(comment.user as any).imageUrl ?? undefined} 
                                alt={comment.user.username ?? comment.user.name ?? 'User'} 
                            />
                            <AvatarFallback className="text-sm">
                                {getInitials(comment.user.name ?? comment.user.username)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">
                                    {comment.user.name ?? comment.user.username ?? 'Anonymous'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                                {comment.content}
                            </p>
                            <div className="flex items-center pt-1">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-muted-foreground hover:text-primary p-0 h-auto"
                                    onClick={() => onReplyClick(comment.id)}
                                    disabled={replyingTo === comment.id}
                                >
                                    <CornerDownRight className="w-4 h-4 mr-1"/>
                                    Reply
                                </Button>
                            </div>
                        </div>
                    </div>
                    {replyingTo === comment.id && (
                        <ReplyForm
                            trackId={trackId}
                            parentId={comment.id}
                            onReplySuccess={onReplySuccess}
                            onCancel={() => onReplyClick('')}
                        />
                    )}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-10 mt-4 border-l-2 border-border/20">
                            <CommentList 
                                comments={comment.replies} 
                                onReplyClick={onReplyClick} 
                                replyingTo={replyingTo}
                                trackId={trackId}
                                onReplySuccess={onReplySuccess}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const CommentsSection: React.FC<CommentsSectionProps> = ({ 
    trackId, 
    title = "Comments",
    className = ""
}) => {
    const { userId: clerkUserId, isSignedIn } = useAuth();
    const [comments, setComments] = useState<CommentWithDetails[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startTransition] = useTransition();
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!trackId) return;

        const fetchComments = async () => {
            setIsLoading(true);
            setError(null);
            const result = await getCommentsForTrack(trackId);
            if (result.success && result.comments !== undefined) {
                setComments(result.comments);
            } else {
                setError(result.error ?? 'Failed to load comments.');
                toast.error(result.error ?? 'Failed to load comments.');
            }
            setIsLoading(false);
        };

        fetchComments();
    }, [trackId]);

    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isSignedIn || !newComment.trim()) return;

        startTransition(async () => {
            const result = await addComment({ trackId, content: newComment.trim() });
            if (result.success && result.comment) {
                toast.success('Comment posted!');
                setComments(prev => {
                    const updated = [...prev, result.comment!];
                    return buildCommentTree(updated);
                });
                setNewComment('');
            } else {
                toast.error(result.error ?? 'Failed to post comment.');
            }
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
        }
    };

    const handleReplySuccess = (newReply: CommentWithDetails) => {
        setComments(prev => {
            const updated = [...prev, newReply];
            return buildCommentTree(updated);
        });
        setReplyingTo(null);
    };

    const buildCommentTree = (list: CommentWithDetails[]): CommentWithDetails[] => {
        const commentMap = new Map<string, CommentWithDetails>();
        const rootComments: CommentWithDetails[] = [];

        // Initialize all comments in the map
        list.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Build the tree
        list.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id)!;
            
            if (comment.parentId) {
                const parent = commentMap.get(comment.parentId);
                if (parent) {
                    parent.replies!.push(commentWithReplies);
                }
            } else {
                rootComments.push(commentWithReplies);
            }
        });

        const sortByDate = (a: CommentWithDetails, b: CommentWithDetails) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        // Sort all levels
        rootComments.sort(sortByDate);
        rootComments.forEach(comment => {
            if (comment.replies) {
                comment.replies.sort(sortByDate);
            }
        });

        return rootComments;
    };

    const topLevelComments = buildCommentTree(comments);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {title} ({comments.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Comment Form */}
                {isSignedIn ? (
                    <form ref={formRef} onSubmit={handleAddComment} className="space-y-3">
                        <Textarea
                            placeholder="Share your thoughts about this track..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={3}
                            className="resize-none"
                            maxLength={1000}
                            aria-label="Comment input"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newComment.trim()}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Post Comment
                            </Button>
                        </div>
                    </form>
                ) : (
                    <p className="text-muted-foreground text-center py-4">
                        Please sign in to leave a comment.
                    </p>
                )}

                <Separator />

                {/* Comments List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <CommentItemSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <p className="text-destructive text-center py-4">{error}</p>
                ) : topLevelComments.length > 0 ? (
                    <CommentList
                        comments={topLevelComments}
                        onReplyClick={setReplyingTo}
                        replyingTo={replyingTo}
                        trackId={trackId}
                        onReplySuccess={handleReplySuccess}
                    />
                ) : (
                    <p className="text-muted-foreground text-center py-8">
                        No comments yet. Be the first to share your thoughts!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}; 