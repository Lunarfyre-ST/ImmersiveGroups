// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-11-16. See CREDITS.md.
import FolderGallery from './FolderGallery';

/** Character, persona and General galleries share FolderGallery; this keeps the original props. */
function Gallery({ characterName, onClose, assignments, characterSettings, onAssign, onUnassign, onRestore, onSaveDetails, onSaveSettings, isPersona = false, folderName, galleryTitle, tagEntity, onOpenGeneral, onOpenExtensionSettings, onOpenLibrary }) {
    const folder = folderName || characterName;
    return <FolderGallery
        key={folder}
        title={galleryTitle || `${isPersona ? 'My Images' : 'Local Images'} - ${characterName}`}
        folder={folder}
        owner={characterName}
        tagEntity={tagEntity || characterName}
        libraryGallery={characterName}
        assignments={assignments || {}}
        settings={characterSettings}
        onSaveSettings={onSaveSettings}
        onAssign={onAssign}
        onUnassign={onUnassign}
        onRestore={onRestore}
        onSaveDetails={onSaveDetails}
        onClose={onClose}
        onOpenLibrary={onOpenLibrary}
        onOpenGeneral={onOpenGeneral}
        onOpenExtensionSettings={onOpenExtensionSettings}
    />;
}

export default Gallery;
