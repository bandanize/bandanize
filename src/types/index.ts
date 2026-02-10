export interface UserSummary {
    id: number;
    username: string;
    name: string;
    email: string;
    photo?: string;
}

export type NotificationType =
    | 'LIST_CREATED'
    | 'SONG_ADDED'
    | 'MEMBER_ADDED'
    | 'MEMBER_REMOVED'
    | 'CHAT_MENTION'
    | 'EVENT_CREATED'
    | 'EVENT_MODIFIED'
    | 'FILE_ADDED'
    | 'TAB_CREATED';

export interface Notification {
    id: number;
    type: NotificationType;
    metadata: Record<string, string>;
    createdAt: string;
    actor: UserSummary;
    title: string;
    message: string;
    isRead: boolean;
}
