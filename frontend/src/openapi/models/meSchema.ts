/**
 * Generated by Orval
 * Do not edit manually.
 * See `gen:api` script in package.json
 */
import type { UserSchema } from './userSchema';
import type { PermissionSchema } from './permissionSchema';
import type { FeedbackResponseSchema } from './feedbackResponseSchema';
import type { MeSchemaSplash } from './meSchemaSplash';

/**
 * Detailed user information
 */
export interface MeSchema {
    user: UserSchema;
    /** User permissions for projects and environments */
    permissions: PermissionSchema[];
    /** User feedback information */
    feedback: FeedbackResponseSchema[];
    /** Splash screen configuration */
    splash: MeSchemaSplash;
}
