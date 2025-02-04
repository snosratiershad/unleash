import NotFoundError from '../error/notfound-error';
import { Logger } from '../logger';
import { FEATURE_TAGGED, FEATURE_UNTAGGED, TAG_CREATED } from '../types/events';
import { IUnleashConfig } from '../types/option';
import { IFeatureToggleStore, IUnleashStores } from '../types/stores';
import { tagSchema } from './tag-schema';
import {
    IFeatureTag,
    IFeatureTagStore,
} from '../types/stores/feature-tag-store';
import { ITagStore } from '../types/stores/tag-store';
import { ITag } from '../types/model';
import { BadDataError, FOREIGN_KEY_VIOLATION } from '../../lib/error';
import EventService from './event-service';

class FeatureTagService {
    private tagStore: ITagStore;

    private featureTagStore: IFeatureTagStore;

    private featureToggleStore: IFeatureToggleStore;

    private eventService: EventService;

    private logger: Logger;

    constructor(
        {
            tagStore,
            featureTagStore,
            featureToggleStore,
        }: Pick<
            IUnleashStores,
            'tagStore' | 'featureTagStore' | 'featureToggleStore'
        >,
        { getLogger }: Pick<IUnleashConfig, 'getLogger'>,
        eventService: EventService,
    ) {
        this.logger = getLogger('/services/feature-tag-service.ts');
        this.tagStore = tagStore;
        this.featureTagStore = featureTagStore;
        this.featureToggleStore = featureToggleStore;
        this.eventService = eventService;
    }

    async listTags(featureName: string): Promise<ITag[]> {
        return this.featureTagStore.getAllTagsForFeature(featureName);
    }

    async listFeatures(tagValue: string): Promise<string[]> {
        return this.featureTagStore.getAllFeaturesForTag(tagValue);
    }

    // TODO: add project Id
    async addTag(
        featureName: string,
        tag: ITag,
        userName: string,
    ): Promise<ITag> {
        const featureToggle = await this.featureToggleStore.get(featureName);
        const validatedTag = await tagSchema.validateAsync(tag);
        await this.createTagIfNeeded(validatedTag, userName);
        await this.featureTagStore.tagFeature(featureName, validatedTag);

        await this.eventService.storeEvent({
            type: FEATURE_TAGGED,
            createdBy: userName,
            featureName,
            project: featureToggle.project,
            data: validatedTag,
        });
        return validatedTag;
    }

    async updateTags(
        featureNames: string[],
        addedTags: ITag[],
        removedTags: ITag[],
        userName: string,
    ): Promise<void> {
        const featureToggles = await this.featureToggleStore.getAllByNames(
            featureNames,
        );
        await Promise.all(
            addedTags.map((tag) => this.createTagIfNeeded(tag, userName)),
        );
        const createdFeatureTags: IFeatureTag[] = featureNames.flatMap(
            (featureName) =>
                addedTags.map((addedTag) => ({
                    featureName,
                    tagType: addedTag.type,
                    tagValue: addedTag.value,
                })),
        );

        await this.featureTagStore.tagFeatures(createdFeatureTags);

        const removedFeatureTags: IFeatureTag[] = featureNames.flatMap(
            (featureName) =>
                removedTags.map((addedTag) => ({
                    featureName,
                    tagType: addedTag.type,
                    tagValue: addedTag.value,
                })),
        );

        await this.featureTagStore.untagFeatures(removedFeatureTags);

        const creationEvents = featureToggles.flatMap((featureToggle) =>
            addedTags.map((addedTag) => ({
                type: FEATURE_TAGGED,
                createdBy: userName,
                featureName: featureToggle.name,
                project: featureToggle.project,
                data: addedTag,
            })),
        );

        const removalEvents = featureToggles.flatMap((featureToggle) =>
            removedTags.map((removedTag) => ({
                type: FEATURE_UNTAGGED,
                createdBy: userName,
                featureName: featureToggle.name,
                project: featureToggle.project,
                preData: removedTag,
            })),
        );

        await this.eventService.storeEvents([
            ...creationEvents,
            ...removalEvents,
        ]);
    }

    async createTagIfNeeded(tag: ITag, userName: string): Promise<void> {
        try {
            await this.tagStore.getTag(tag.type, tag.value);
        } catch (error) {
            if (error instanceof NotFoundError) {
                try {
                    await this.tagStore.createTag(tag);
                    await this.eventService.storeEvent({
                        type: TAG_CREATED,
                        createdBy: userName,
                        data: tag,
                    });
                } catch (err) {
                    if (err.code === FOREIGN_KEY_VIOLATION) {
                        throw new BadDataError(
                            `Tag type '${tag.type}' does not exist`,
                        );
                    }
                }
            }
        }
    }

    // TODO: add project Id
    async removeTag(
        featureName: string,
        tag: ITag,
        userName: string,
    ): Promise<void> {
        const featureToggle = await this.featureToggleStore.get(featureName);
        const tags = await this.featureTagStore.getAllTagsForFeature(
            featureName,
        );
        await this.featureTagStore.untagFeature(featureName, tag);
        await this.eventService.storeEvent({
            type: FEATURE_UNTAGGED,
            createdBy: userName,
            featureName,
            project: featureToggle.project,
            preData: tag,
            tags,
        });
    }
}

export default FeatureTagService;
