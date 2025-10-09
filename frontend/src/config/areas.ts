export interface StudyArea {
    name: string;
    displayName: string;
    audioPath: string;
    videoPath: string;
}

export const STUDY_AREAS: { [key: string]: StudyArea } = {
  bonebottom: { name: 'bonebottom', displayName: 'Bonebottom', audioPath: '/assets/sounds/bone_bottom.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  choralchambers: { name: 'choralchambers', displayName: 'Choral Chambers', audioPath: '/assets/sounds/choral_chambers.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  farfields: { name: 'farfields', displayName: 'Far Fields', audioPath: '/assets/sounds/far_fields.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  bellbeast: { name: 'bellbeast', displayName: 'Bell Beast', audioPath: '/assets/sounds/bell_beast.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  bellhart: { name: 'bellhart', displayName: 'Bellhart', audioPath: '/assets/sounds/bellhart.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  bilewater: { name: 'bilewater', displayName: 'Bilewater', audioPath: '/assets/sounds/bilewater.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  blastedsteps: { name: 'blastedsteps', displayName: 'Blasted Steps', audioPath: '/assets/sounds/blasted_steps.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  deepdocks: { name: 'deepdocks', displayName: 'Deep Docks', audioPath: '/assets/sounds/deep_docks.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  enterpharloom: { name: 'enterpharloom', displayName: 'Enter Pharloom', audioPath: '/assets/sounds/enter_pharloom.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  greymoor: { name: 'greymoor', displayName: 'Greymoor', audioPath: '/assets/sounds/greymoor.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  lace: { name: 'lace', displayName: 'Lace', audioPath: '/assets/sounds/lace.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  mossgrotto: { name: 'mossgrotto', displayName: 'Moss Grotto', audioPath: '/assets/sounds/moss_grotto.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  mountfay: { name: 'mountfay', displayName: 'Mount Fay', audioPath: '/assets/sounds/mount_fay.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  repose: { name: 'repose', displayName: 'Repose', audioPath: '/assets/sounds/repose.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  shellwood: { name: 'shellwood', displayName: 'Shellwood', audioPath: '/assets/sounds/shellwood.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  silksong: { name: 'silksong', displayName: 'Silksong', audioPath: '/assets/sounds/silksong.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  sinnersroad: { name: 'sinnersroad', displayName: "Sinner's Road", audioPath: '/assets/sounds/sinners_road.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  strive: { name: 'strive', displayName: 'Strive', audioPath: '/assets/sounds/strive.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  themarrow: { name: 'themarrow', displayName: 'The Marrow', audioPath: '/assets/sounds/the_marrow.mp3', videoPath: '/assets/videos/bench_short.mp4' },
  theslab: { name: 'theslab', displayName: 'The Slab', audioPath: '/assets/sounds/the_slab.mp3', videoPath: '/assets/videos/bench_short.mp4' },
};

export const getAreaByName = (name: string): StudyArea | null => {
    return STUDY_AREAS[name] || null;
};
