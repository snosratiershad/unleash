import { ConditionallyRender } from 'component/common/ConditionallyRender/ConditionallyRender';
import { AddDependencyDialogue } from 'component/feature/Dependencies/AddDependencyDialogue';
import { IFeatureToggle } from 'interfaces/featureToggle';
import { FC, useState } from 'react';
import { FlexRow, StyledDetail, StyledLabel, StyledLink } from './StyledRow';
import { DependencyActions } from './DependencyActions';
import { useDependentFeaturesApi } from 'hooks/api/actions/useDependentFeaturesApi/useDependentFeaturesApi';
import { useFeature } from 'hooks/api/getters/useFeature/useFeature';
import { ChildrenTooltip } from './ChildrenTooltip';
import PermissionButton from 'component/common/PermissionButton/PermissionButton';
import { UPDATE_FEATURE_DEPENDENCY } from 'component/providers/AccessProvider/permissions';
import { useCheckProjectPermissions } from 'hooks/useHasAccess';

export const DependencyRow: FC<{ feature: IFeatureToggle }> = ({ feature }) => {
    const { removeDependencies } = useDependentFeaturesApi(feature.project);
    const { refetchFeature } = useFeature(feature.project, feature.name);
    const [showDependencyDialogue, setShowDependencyDialogue] = useState(false);
    const canAddParentDependency =
        Boolean(feature.project) &&
        feature.dependencies.length === 0 &&
        feature.children.length === 0;
    const hasParentDependency =
        Boolean(feature.project) && Boolean(feature.dependencies.length > 0);
    const hasChildren = Boolean(feature.project) && feature.children.length > 0;
    const checkAccess = useCheckProjectPermissions(feature.project);

    return (
        <>
            <ConditionallyRender
                condition={canAddParentDependency}
                show={
                    <FlexRow>
                        <StyledDetail>
                            <StyledLabel>Dependency:</StyledLabel>
                            <PermissionButton
                                permission={UPDATE_FEATURE_DEPENDENCY}
                                projectId={feature.project}
                                variant='text'
                                onClick={() => {
                                    setShowDependencyDialogue(true);
                                }}
                            >
                                Add parent feature
                            </PermissionButton>
                        </StyledDetail>
                    </FlexRow>
                }
            />
            <ConditionallyRender
                condition={hasParentDependency}
                show={
                    <FlexRow>
                        <StyledDetail>
                            <StyledLabel>Dependency:</StyledLabel>
                            <StyledLink
                                to={`/projects/${feature.project}/features/${feature.dependencies[0]?.feature}`}
                            >
                                {feature.dependencies[0]?.feature}
                            </StyledLink>
                        </StyledDetail>
                        <ConditionallyRender
                            condition={checkAccess(UPDATE_FEATURE_DEPENDENCY)}
                            show={
                                <DependencyActions
                                    feature={feature.name}
                                    onEdit={() =>
                                        setShowDependencyDialogue(true)
                                    }
                                    onDelete={async () => {
                                        await removeDependencies(feature.name);
                                        await refetchFeature();
                                    }}
                                />
                            }
                        />
                    </FlexRow>
                }
            />
            <ConditionallyRender
                condition={hasChildren}
                show={
                    <FlexRow>
                        <StyledDetail>
                            <StyledLabel>Children:</StyledLabel>
                            <ChildrenTooltip
                                childFeatures={feature.children}
                                project={feature.project}
                            />
                        </StyledDetail>
                    </FlexRow>
                }
            />
            <ConditionallyRender
                condition={Boolean(feature.project)}
                show={
                    <AddDependencyDialogue
                        project={feature.project}
                        featureId={feature.name}
                        onClose={() => setShowDependencyDialogue(false)}
                        showDependencyDialogue={showDependencyDialogue}
                    />
                }
            />
        </>
    );
};
