import { LogLevel, Player, PlayerConfig, PlayerEvent, SegmentPlaybackEvent, SourceConfig } from 'bitmovin-player/modules/bitmovinplayer-core';
import PolyfillModule from 'bitmovin-player/modules/bitmovinplayer-polyfill';
import EngineBitmovinModule from 'bitmovin-player/modules/bitmovinplayer-engine-bitmovin';
import EngineNative from 'bitmovin-player/modules/bitmovinplayer-engine-native';
import MseRendererModule from 'bitmovin-player/modules/bitmovinplayer-mserenderer';
import HlsModule from 'bitmovin-player/modules/bitmovinplayer-hls';
import XmlModule from 'bitmovin-player/modules/bitmovinplayer-xml';
import DashModule from 'bitmovin-player/modules/bitmovinplayer-dash';
import AbrModule from 'bitmovin-player/modules/bitmovinplayer-abr';
import ContainerTSModule from 'bitmovin-player/modules/bitmovinplayer-container-ts';
import ContainerMp4Module from 'bitmovin-player/modules/bitmovinplayer-container-mp4';
import SubtitlesModule from 'bitmovin-player/modules/bitmovinplayer-subtitles';
import SubtitlesCEA608Module from 'bitmovin-player/modules/bitmovinplayer-subtitles-cea608';
import StyleModule from 'bitmovin-player/modules/bitmovinplayer-style';

import { UIFactory } from 'bitmovin-player-ui';
import 'bitmovin-player-ui/dist/css/bitmovinplayer-ui.css'

Player.addModule(EngineBitmovinModule);
Player.addModule(PolyfillModule);
Player.addModule(MseRendererModule);
Player.addModule(HlsModule);
Player.addModule(XmlModule);
Player.addModule(DashModule);
Player.addModule(AbrModule);
Player.addModule(ContainerTSModule);
Player.addModule(ContainerMp4Module);
Player.addModule(SubtitlesModule);
Player.addModule(SubtitlesCEA608Module);
Player.addModule(StyleModule);
Player.addModule(EngineNative);

const conf: PlayerConfig = {
  key: "YOUR-KEY-HERE",
  logs: {
    level: LogLevel.DEBUG
  },
  ui: false,
  tweaks: {
    native_hls_parsing: true,
  }
};

const player = new Player(document.getElementById("player"), conf);

const uiManager = UIFactory.buildDefaultUI(player);

const source: SourceConfig = {
  hls: "http://localhost:8090/index.m3u8",
};

player.on(PlayerEvent.Paused, () => {
  console.log("Player is paused!");
});

const formatTime = (time: number) => {
  const timeFormatted = (Math.round(time * 100) / 100).toFixed(2);
  return timeFormatted;
}

let program_data_time_minus_playback_time = 0;  // in seconds

player.on(PlayerEvent.SegmentPlayback, (event ) => {
  console.log("PlayTime: " + formatTime(player.getCurrentTime()) + " SegmentPlayback: " + JSON.stringify(event));
  const segmentPlaybackEvent = event as SegmentPlaybackEvent;
  const playbackTime = segmentPlaybackEvent.playbackTime;  // in seconds
  const dateTime = segmentPlaybackEvent.dateTime;
  if (dateTime) {
    const date = new Date(dateTime);
    program_data_time_minus_playback_time = date.getTime() / 1000 - playbackTime;
  }
});

player.on(PlayerEvent.SourceLoaded, () => {
  console.log("SourceLoaded!");
  const currentTimeDisplay = document.getElementById('timeCode');
  const frameRateFps = 60;

  setInterval(() => {
    const playtime = player.getCurrentTime(); // in seconds (float)
    const currentProgramTime = playtime + program_data_time_minus_playback_time; // in seconds (float) 
    const timeInMinute = currentProgramTime % 60; // crop to last started minute (float)
    const currentSecond = Math.floor(timeInMinute);
    const currentFraction = timeInMinute - currentSecond; // in seconds
    const currentFrame =  Math.floor(currentFraction * frameRateFps)
    const secondAndFrame = currentSecond.toString().padStart(2, '0') + ":" + 
                           currentFrame.toString().padStart(2, '0');

    const timeInMinuteFormatted = formatTime(timeInMinute);

    currentTimeDisplay.innerHTML = timeInMinuteFormatted + " <br/> Second:Frame: " + secondAndFrame;
  }, 5);
});

player.load(source);