import { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Avatar,
    Chip,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material';
import { Send, MoreVert, Delete, Edit } from '@mui/icons-material';

interface Comment {
    id: string;
    author: string;
    authorAvatar?: string;
    content: string;
    createdAt: Date;
    mentions?: string[];
}

interface CommentSectionProps {
    resourceType: 'risk' | 'policy' | 'control' | 'incident';
    resourceId: string;
    onCommentAdded?: (comment: Comment) => void;
}

export default function CommentSection({ resourceType: _resourceType, resourceId: _resourceId, onCommentAdded }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([
        {
            id: '1',
            author: 'Admin User',
            authorAvatar: 'A',
            content: 'This risk needs immediate attention. @ComplianceOfficer please review.',
            createdAt: new Date('2024-12-12T10:00:00'),
            mentions: ['ComplianceOfficer'],
        },
        {
            id: '2',
            author: 'Compliance Officer',
            authorAvatar: 'C',
            content: 'Reviewed. I recommend escalating to the security team for remediation.',
            createdAt: new Date('2024-12-12T11:30:00'),
        },
    ]);
    const [newComment, setNewComment] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedComment, setSelectedComment] = useState<string | null>(null);

    const handleAddComment = () => {
        if (!newComment.trim()) return;

        // Extract mentions (@username)
        const mentions = newComment.match(/@\w+/g)?.map(m => m.substring(1)) || [];

        const comment: Comment = {
            id: Date.now().toString(),
            author: 'Current User',
            authorAvatar: 'U',
            content: newComment,
            createdAt: new Date(),
            mentions,
        };

        setComments(prev => [...prev, comment]);
        setNewComment('');

        if (onCommentAdded) {
            onCommentAdded(comment);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedComment(commentId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedComment(null);
    };

    const handleDeleteComment = () => {
        if (selectedComment) {
            setComments(prev => prev.filter(c => c.id !== selectedComment));
        }
        handleMenuClose();
    };

    const formatTime = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Discussion ({comments.length})
            </Typography>

            {/* Comments List */}
            <Box sx={{ mb: 3 }}>
                {comments.map((comment) => (
                    <Box
                        key={comment.id}
                        sx={{
                            display: 'flex',
                            gap: 2,
                            mb: 3,
                            p: 2,
                            bgcolor: '#0f1729',
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Avatar sx={{ bgcolor: '#667eea', width: 36, height: 36 }}>
                            {comment.authorAvatar}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {comment.author}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                        {formatTime(comment.createdAt)}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, comment.id)}
                                    sx={{ color: 'rgba(255,255,255,0.5)' }}
                                >
                                    <MoreVert fontSize="small" />
                                </IconButton>
                            </Box>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                {comment.content}
                            </Typography>
                            {comment.mentions && comment.mentions.length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {comment.mentions.map((mention) => (
                                        <Chip
                                            key={mention}
                                            label={`@${mention}`}
                                            size="small"
                                            sx={{
                                                bgcolor: '#667eea20',
                                                color: '#667eea',
                                                height: 20,
                                                fontSize: '0.7rem',
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* New Comment Input */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#667eea', width: 36, height: 36 }}>U</Avatar>
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Add a comment... Use @username to mention someone"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: '#0f1729',
                        },
                    }}
                />
                <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        height: 'fit-content',
                        alignSelf: 'flex-end',
                    }}
                >
                    Comment
                </Button>
            </Box>

            {/* Context Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleMenuClose}>
                    <Edit sx={{ mr: 1, fontSize: 18 }} /> Edit
                </MenuItem>
                <MenuItem onClick={handleDeleteComment} sx={{ color: '#f5576c' }}>
                    <Delete sx={{ mr: 1, fontSize: 18 }} /> Delete
                </MenuItem>
            </Menu>
        </Box>
    );
}
