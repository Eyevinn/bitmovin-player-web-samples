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

class Timestamp {
  fps: number;
  hours: number;
  minutes: number;
  seconds: number;
  frameNr: number;
  dropFrames: boolean;

  constructor(fps: number, hours: number, minutes: number, seconds: number, frameNr: number, dropFrames: boolean) {
      if (fps != 30 && fps != 60) {
          throw new Error(`Unsupported fps: ${fps}`);
      }
      if (!dropFrames) {
          throw new Error("Only drop frames is supported");
      }
      if (seconds == 0 && (minutes % 10 != 0) && frameNr < 2*fps/30) {
          throw new Error(`Invalid timestamp: ${hours}:${minutes}:${seconds}:${frameNr}`);
      }
      if (hours > 23 || minutes > 59 || seconds > 59 || frameNr >= fps) {
          throw new Error(`Invalid timestamp: ${hours}:${minutes}:${seconds}:${frameNr}`);
      }
      if (hours < 0 || minutes < 0 || seconds < 0 || frameNr < 0) {
          throw new Error(`Invalid timestamp: ${hours}:${minutes}:${seconds}:${frameNr}`);
      }
      this.fps = fps;
      this.hours = hours;
      this.minutes = minutes;
      this.seconds = seconds;
      this.frameNr = frameNr;
      this.dropFrames = dropFrames;
  };

  toString(): string {
    const hours = this.hours.toString().padStart(2, '0');
    const minutes = this.minutes.toString().padStart(2, '0');
    const seconds = this.seconds.toString().padStart(2, '0');
    let frameNr = this.frameNr.toString().padStart(2, '0');

    switch (this.fps) {
      case 30:
        return `${hours}.${minutes}:${seconds}.${frameNr}`;
      case 60:
        frameNr = Math.floor(this.frameNr / 2).toString().padStart(2, '0');
        return `${hours}.${minutes}:${seconds}:${frameNr}.${1 + this.frameNr % 2}`;
      default:
        throw new Error(`Unsupported fps: ${this.fps}`);
    }
  }
}

function NewTimestampFromMS(ms: number, fps: number, dropFrames: boolean): Timestamp {
  if (!dropFrames) {
    throw new Error("Only drop frames is supported");
  }
  const frameNr = Math.floor(Math.round(ms * fps / 1001)) + 1; // Show next frame on screen
  return NewTimestampFromFrameNr(frameNr, fps, dropFrames);
};

function NewTimestampFromFrameNr(frameNr: number, fps: number, dropFrames: boolean): Timestamp {
  if (!dropFrames) {
      throw new Error("Only drop frames is supported");
  }
  let nrDrop = Math.floor(2 * fps / 30);
  let framesPer10Min = (10 * 60 * fps - 9 * nrDrop);
  let nr10MinutesStarted = Math.floor(frameNr / framesPer10Min);
  let hours = Math.floor(nr10MinutesStarted / 6);
  let nr10Minutes = nr10MinutesStarted - hours * 6;
  let nr10MinuteFrames = nr10MinutesStarted * framesPer10Min;
  let restFrameNr = frameNr - nr10MinuteFrames;
  let maxFramesFirstMinute = 60 * fps;
  if (restFrameNr < maxFramesFirstMinute) {
      let seconds = Math.floor(restFrameNr / fps);
      restFrameNr = restFrameNr - seconds * fps;
      return new Timestamp(fps, hours, nr10Minutes * 10, seconds, restFrameNr, dropFrames);
  }
  let minutes = nr10Minutes * 10;
  let nrExtraMinutes = 0;
  if (restFrameNr < maxFramesFirstMinute) {
      let seconds = Math.floor(restFrameNr / fps);
      restFrameNr = restFrameNr - seconds * fps;
      return new Timestamp(fps, hours, minutes, seconds, restFrameNr, dropFrames);
  }
  restFrameNr -= maxFramesFirstMinute;
  minutes++;
  nrExtraMinutes = Math.floor(restFrameNr / (60 * fps - nrDrop));
  restFrameNr -= nrExtraMinutes * (60 * fps - nrDrop);
  minutes += nrExtraMinutes;
  if (restFrameNr < fps - nrDrop) {
      // first second
      let seconds = 0;
      let frameNr = restFrameNr + nrDrop;
      return new Timestamp(fps, hours, minutes, seconds, frameNr, dropFrames);
  }
  restFrameNr -= fps - nrDrop;
  let seconds = 1;
  let extraSeconds = Math.floor(restFrameNr / fps);
  restFrameNr -= extraSeconds * fps;
  seconds += extraSeconds;
  return new Timestamp(fps, hours, minutes, seconds, restFrameNr, dropFrames);
}

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
  hls: "http://localhost:8001/index.m3u8",
};

player.on(PlayerEvent.Paused, () => {
  console.log("Player is paused!");
});

const formatTime = (time: number) => {
  const timeFormatted = (Math.round(time * 100) / 100).toFixed(2);
  return timeFormatted;
}

const FrameRateFps = 60;
const CurrentTimeDisplay = document.getElementById('timeStamp');
let baseProgramDateTime = 0;  // in seconds

player.on(PlayerEvent.SegmentPlayback, (event ) => {
  console.log("PlayTime: " + formatTime(player.getCurrentTime()) + " SegmentPlayback: " + JSON.stringify(event));
  const segmentPlaybackEvent = event as SegmentPlaybackEvent;
  const playbackTime = segmentPlaybackEvent.playbackTime;  // in seconds(float)
  const dateTime = segmentPlaybackEvent.dateTime;
  if (dateTime) {
    const date = new Date(dateTime);  // in milliseconds
    baseProgramDateTime = date.getTime() / 1000 - playbackTime;
  }
});

player.on(PlayerEvent.SourceLoaded, () => {
  console.log("SourceLoaded!");
});

// This function is called every time the browser is ready to render a new frame (60 fps).
function updateFrameNum(t: DOMHighResTimeStamp) {
  const playtime = player.getCurrentTime(); // in seconds (float)
  const currentProgramTime = playtime + baseProgramDateTime; // in seconds (float) 
  const currentMilliSecond = Math.floor(currentProgramTime * 1000);

  const timestamp = NewTimestampFromMS(currentMilliSecond, FrameRateFps, true);
  CurrentTimeDisplay.innerHTML = timestamp.toString();

  // To be called recursively
  requestAnimationFrame(updateFrameNum);
}

player.load(source);

// Start the updateFrameNum function
requestAnimationFrame(updateFrameNum);