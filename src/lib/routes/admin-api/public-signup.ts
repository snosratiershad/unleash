import { Response } from 'express';

import Controller from '../controller';
import {
    ADMIN,
    IUnleashConfig,
    IUnleashServices,
    serializeDates,
} from '../../types';
import { Logger } from '../../logger';
import {
    AccessService,
    OpenApiService,
    PublicSignupTokenService,
} from '../../services';
import { IAuthRequest } from '../unleash-types';
import {
    createRequestSchema,
    createResponseSchema,
    getStandardResponses,
    PublicSignupTokenCreateSchema,
    publicSignupTokenSchema,
    PublicSignupTokenSchema,
    publicSignupTokensSchema,
    PublicSignupTokensSchema,
    PublicSignupTokenUpdateSchema,
    resourceCreatedResponseSchema,
} from '../../openapi';
import UserService from '../../services/user-service';
import { extractUsername } from '../../util';

interface TokenParam {
    token: string;
}

export class PublicSignupController extends Controller {
    private publicSignupTokenService: PublicSignupTokenService;

    private userService: UserService;

    private accessService: AccessService;

    private openApiService: OpenApiService;

    private logger: Logger;

    constructor(
        config: IUnleashConfig,
        {
            publicSignupTokenService,
            accessService,
            userService,
            openApiService,
        }: Pick<
            IUnleashServices,
            | 'publicSignupTokenService'
            | 'accessService'
            | 'userService'
            | 'openApiService'
        >,
    ) {
        super(config);
        this.publicSignupTokenService = publicSignupTokenService;
        this.accessService = accessService;
        this.userService = userService;
        this.openApiService = openApiService;
        this.logger = config.getLogger('public-signup-controller.js');

        this.route({
            method: 'get',
            path: '/tokens',
            handler: this.getAllPublicSignupTokens,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Public signup tokens'],
                    summary: 'Get public signup tokens',
                    description: 'Retrieves all existing public signup tokens.',
                    operationId: 'getAllPublicSignupTokens',
                    responses: {
                        200: createResponseSchema('publicSignupTokensSchema'),
                    },
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '/tokens',
            handler: this.createPublicSignupToken,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Public signup tokens'],
                    operationId: 'createPublicSignupToken',
                    summary: 'Create a public signup token',
                    description:
                        'Lets administrators create a invite link to share with colleagues.  People that join using the public invite are assigned the `Viewer` role',
                    requestBody: createRequestSchema(
                        'publicSignupTokenCreateSchema',
                    ),
                    responses: {
                        201: resourceCreatedResponseSchema(
                            'publicSignupTokenSchema',
                        ),
                        ...getStandardResponses(400, 401, 403),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/tokens/:token',
            handler: this.getPublicSignupToken,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Public signup tokens'],
                    summary: 'Retrieve a token',
                    description:
                        "Get information about a specific token. The `:token` part of the URL should be the token's secret.",
                    operationId: 'getPublicSignupToken',
                    responses: {
                        200: createResponseSchema('publicSignupTokenSchema'),
                        ...getStandardResponses(401, 403),
                    },
                }),
            ],
        });

        this.route({
            method: 'put',
            path: '/tokens/:token',
            handler: this.updatePublicSignupToken,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Public signup tokens'],
                    operationId: 'updatePublicSignupToken',
                    summary: 'Update a public signup token',
                    description:
                        "Update information about a specific token. The `:token` part of the URL should be the token's secret.",

                    requestBody: createRequestSchema(
                        'publicSignupTokenUpdateSchema',
                    ),
                    responses: {
                        200: createResponseSchema('publicSignupTokenSchema'),
                        ...getStandardResponses(400, 401, 403),
                    },
                }),
            ],
        });
    }

    async getAllPublicSignupTokens(
        req: IAuthRequest,
        res: Response<PublicSignupTokensSchema>,
    ): Promise<void> {
        const tokens = await this.publicSignupTokenService.getAllTokens();
        this.openApiService.respondWithValidation(
            200,
            res,
            publicSignupTokensSchema.$id,
            { tokens: serializeDates(tokens) },
        );
    }

    async getPublicSignupToken(
        req: IAuthRequest<TokenParam>,
        res: Response<PublicSignupTokenSchema>,
    ): Promise<void> {
        const { token } = req.params;
        const result = await this.publicSignupTokenService.get(token);
        this.openApiService.respondWithValidation(
            200,
            res,
            publicSignupTokenSchema.$id,
            serializeDates(result),
        );
    }

    async createPublicSignupToken(
        req: IAuthRequest<void, void, PublicSignupTokenCreateSchema>,
        res: Response<PublicSignupTokenSchema>,
    ): Promise<void> {
        const username = extractUsername(req);
        const token =
            await this.publicSignupTokenService.createNewPublicSignupToken(
                req.body,
                username,
            );
        this.openApiService.respondWithValidation(
            201,
            res,
            publicSignupTokenSchema.$id,
            serializeDates(token),
            { location: `tokens/${token.secret}` },
        );
    }

    async updatePublicSignupToken(
        req: IAuthRequest<TokenParam, void, PublicSignupTokenUpdateSchema>,
        res: Response,
    ): Promise<any> {
        const { token } = req.params;
        const { expiresAt, enabled } = req.body;

        if (!expiresAt && enabled === undefined) {
            this.logger.error(req.body);
            return res.status(400).send();
        }

        const result = await this.publicSignupTokenService.update(
            token,
            {
                ...(enabled === undefined ? {} : { enabled }),
                ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
            },
            extractUsername(req),
        );

        this.openApiService.respondWithValidation(
            200,
            res,
            publicSignupTokenSchema.$id,
            serializeDates(result),
        );
    }
}
