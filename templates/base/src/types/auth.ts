/** Service inputs use actor context instead of Express request objects. */
export interface Actor { id: string; sessionId: string; email: string; name: string; role: string; emailVerified: boolean; }
