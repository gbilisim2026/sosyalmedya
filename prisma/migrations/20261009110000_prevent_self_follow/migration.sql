ALTER TABLE `Follow`
  ADD CONSTRAINT `Follow_no_self_follow`
  CHECK (`followerId` <> `followingId`);

ALTER TABLE `FollowRequest`
  ADD CONSTRAINT `FollowRequest_no_self_request`
  CHECK (`requesterId` <> `targetId`);
