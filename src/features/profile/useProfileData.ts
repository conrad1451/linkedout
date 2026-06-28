import { useEffect, useState } from 'react';
import { queryDataset, type DatasetRow, type ImportMeta } from '../../lib/store';
import type { LinkedInProfileInfo } from '../../lib/linkedin/profile';
import {
  datasetFor,
  endorsementCounts,
  fullName,
  makeActivities,
  sortByDateDesc,
  sortPositions,
  type ActivityItem,
} from './model';

export interface ProfileData {
  profile?: DatasetRow;
  registration?: DatasetRow;
  linkedInProfile?: LinkedInProfileInfo;
  positions: DatasetRow[];
  education: DatasetRow[];
  courses: DatasetRow[];
  honors: DatasetRow[];
  languages: DatasetRow[];
  skills: Array<{ name: string; endorsements: number }>;
  recommendationsReceived: DatasetRow[];
  recommendationsGiven: DatasetRow[];
  companyFollows: DatasetRow[];
  memberFollows: DatasetRow[];
  hashtagFollows: DatasetRow[];
  activity: ActivityItem[];
  counts: {
    connections: number;
    posts: number;
    comments: number;
    reactions: number;
  };
}

export interface UseProfileDataState {
  data: ProfileData | null;
  loading: boolean;
  error: string | null;
}

export function useProfileData(importMeta: ImportMeta | null): UseProfileDataState {
  const [state, setState] = useState<UseProfileDataState>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!importMeta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when active import clears
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    (async () => {
      try {
        const [
          profile,
          registration,
          positions,
          education,
          courses,
          honors,
          languages,
          skills,
          endorsements,
          recommendationsReceived,
          recommendationsGiven,
          companyFollows,
          memberFollows,
          hashtagFollows,
          // network-related datasets
          connections,
          invitations,
          // event datasets
          events,
          shares,
          richMedia,
          comments,
          reactions,
          votes,
          reposts,
          jobApplications,
          savedJobs,
          adsClicked,
          savedItems,
          endorsementsGiven,
          emailAddresses,
          importedContacts,
          verifications,
          logins,
          securityChallenges,
          searchQueries,
          receipts,
          messages,
          guideMessages,
          learningCoachMessages,
          learningRolePlayMessages,
          learning,
        ] = await Promise.all([
          loadRows(importMeta, 'profile'),
          loadRows(importMeta, 'registration'),
          loadRows(importMeta, 'positions'),
          loadRows(importMeta, 'education'),
          loadRows(importMeta, 'courses'),
          loadRows(importMeta, 'honors'),
          loadRows(importMeta, 'languages'),
          loadRows(importMeta, 'skills'),
          loadRows(importMeta, 'endorsements-received'),
          loadRows(importMeta, 'recommendations-received'),
          loadRows(importMeta, 'recommendations-given'),
          loadRows(importMeta, 'company-follows'),
          loadRows(importMeta, 'member-follows'),
          loadRows(importMeta, 'hashtag-follows'),
          loadRows(importMeta, 'connections'),
          loadRows(importMeta, 'invitations'),
          loadRows(importMeta, 'events'),
          loadRows(importMeta, 'shares'),
          loadRows(importMeta, 'rich-media'),
          loadRows(importMeta, 'comments'),
          loadRows(importMeta, 'reactions'),
          loadRows(importMeta, 'votes'),
          loadRows(importMeta, 'reposts'),
          loadRows(importMeta, 'jobs-applications'),
          loadRows(importMeta, 'jobs-saved'),
          loadRows(importMeta, 'ads-clicked'),
          loadRows(importMeta, 'saved-items'),
          loadRows(importMeta, 'endorsements-given'),
          loadRows(importMeta, 'email-addresses'),
          loadRows(importMeta, 'imported-contacts'),
          loadRows(importMeta, 'verifications'),
          loadRows(importMeta, 'logins'),
          loadRows(importMeta, 'security-challenges'),
          loadRows(importMeta, 'search-queries'),
          loadRows(importMeta, 'receipts'),
          loadRows(importMeta, 'messages'),
          loadRows(importMeta, 'guide-messages'),
          loadRows(importMeta, 'learning-coach-messages'),
          loadRows(importMeta, 'learning-role-play-messages'),
          loadRows(importMeta, 'learning'),
        ]);

        const counts = endorsementCounts(endorsements);
        const sortedRecommendationsReceived = sortByDateDesc(
          recommendationsReceived,
          'Creation Date',
        );
        const sortedRecommendationsGiven = sortByDateDesc(recommendationsGiven, 'Creation Date');
        const next: ProfileData = {
          profile: profile[0],
          registration: registration[0],
          linkedInProfile: importMeta.linkedInProfile,
          positions: sortPositions(positions),
          education: sortByDateDesc(education, 'Start Date'),
          courses,
          honors: sortByDateDesc(honors, 'Issued On'),
          languages,
          skills: skills.map((row) => ({
            name: String(row.Name ?? ''),
            endorsements: counts.get(String(row.Name ?? '')) ?? 0,
          })),
          recommendationsReceived: sortedRecommendationsReceived,
          recommendationsGiven: sortedRecommendationsGiven,
          companyFollows: sortByDateDesc(companyFollows, 'Followed On'),
          memberFollows: sortByDateDesc(memberFollows, 'Date'),
          hashtagFollows: sortByDateDesc(hashtagFollows, 'CreatedTime'),
          activity: makeActivities({
            ownerName: fullName(profile[0]),
            shares,
            richMedia,
            comments,
            reactions,
            votes,
            reposts,
            jobApplications,
            savedJobs,
            adsClicked,
            savedItems,
            endorsementsGiven,
            endorsementsReceived: endorsements,
            emailAddresses,
            registration,
            importedContacts,
            verifications,
            logins,
            securityChallenges,
            searchQueries,
            receipts,
            messages,
            guideMessages,
            learningCoachMessages,
            learningRolePlayMessages,
            learning,
            recommendationsReceived: sortedRecommendationsReceived,
            recommendationsGiven: sortedRecommendationsGiven,
            connections,
            invitations,
            memberFollows,
            companyFollows,
            hashtagFollows,
            events,
          }),
          counts: {
            connections: datasetFor(importMeta, 'connections')?.rowCount ?? 0,
            posts: shares.length + richMedia.length + reposts.length,
            comments: comments.length,
            reactions: reactions.length,
          },
        };

        if (!cancelled) setState({ data: next, loading: false, error: null });
      } catch (error) {
        console.error('[useProfileData] load failed', error);
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [importMeta]);

  return state;
}

async function loadRows(importMeta: ImportMeta, schemaId: string): Promise<DatasetRow[]> {
  const dataset = datasetFor(importMeta, schemaId);
  if (!dataset || dataset.rowCount === 0) return [];
  return queryDataset(importMeta.id, dataset.datasetId, { limit: dataset.rowCount });
}
