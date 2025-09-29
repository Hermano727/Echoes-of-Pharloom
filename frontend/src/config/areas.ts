export interface StudyArea {
    name: string;
    displayName: string;
    audioPath: string;
    videoPath: string;
}

export const STUDY_AREAS: { [key: string]: StudyArea } = {
    bonebottom: {
        name: 'bonebottom',
        displayName: 'Bonebottom',
        audioPath: '/assets/sounds/bone_bottom.mp3',
        videoPath: '/assets/videos/bench_short.mp4',
    },
    choralchambers: {
        name: 'choralchambers',
        displayName: 'Choral Chambers',
        audioPath: '/assets/sounds/choral_chambers.mp3',
        videoPath: '/assets/videos/bench_short.mp4',
    },
    farfields: {
        name: 'farfields',
        displayName: 'Far Fields',
        audioPath: '/assets/sounds/far_fields.mp3',
        videoPath: '/assets/videos/far_fields.mp4',
    },
    hunters: {
        name: 'hunters',
        displayName: "Hunter's Path",
        audioPath: '/assets/sounds/hunters_path.mp3',
        videoPath: '/assets/videos/hunters_path.mp4',
    },
};

export const getAreaByName = (name: string): StudyArea | null => {
    return STUDY_AREAS[name] || null;
};
