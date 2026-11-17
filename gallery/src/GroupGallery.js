// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-11-16. See CREDITS.md.
import FolderGallery from './FolderGallery';

/** Member names that already use an image name, so a group image name can be checked for ambiguity. */
export function findMemberConflicts(imageName, memberAssignments) {
    return Object.entries(memberAssignments || {}).filter(([, assignments]) => imageName && Object.hasOwn(assignments || {}, imageName)).map(([memberName]) => memberName);
}

/** Group images are editable; member galleries are shown read-only underneath. */
function GroupGallery({ groupName, groupId, memberNames = [], memberAssignments = {}, groupAssignments, groupSettings, onClose, onOpenLibrary, onAssignGroup, onUnassignGroup, onRestoreGroup, onSaveGroupDetails, onSaveGroupSettings }) {
    const folder = `_group_${groupId}`;
    return <FolderGallery
        key={folder}
        title={`Group Images - ${groupName}`}
        folder={folder}
        owner={groupName}
        tagEntity={groupName}
        libraryGallery={groupName}
        assignments={groupAssignments || {}}
        settings={groupSettings}
        onSaveSettings={onSaveGroupSettings}
        onAssign={onAssignGroup}
        onUnassign={onUnassignGroup}
        onRestore={onRestoreGroup}
        onSaveDetails={onSaveGroupDetails}
        onClose={onClose}
        onOpenLibrary={onOpenLibrary}
        members={memberNames.map(name => ({ name, folder: name, assignments: memberAssignments[name] || {} }))}
        conflictsFor={name => findMemberConflicts(name, memberAssignments)}
        usageHint={<>Use <code>{`::img ${groupName} name::`}</code> for group images, or <code>::img MemberName name::</code> for member images.</>}
        emptyHint="Upload images shared by all members (locations, scenes, etc.)."
        uploadTitle="Upload group images"
    />;
}

export default GroupGallery;
