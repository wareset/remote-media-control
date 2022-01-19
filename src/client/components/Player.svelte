<script lang="ts">
  import { slide } from "svelte/transition";

  import { clearLocationHash } from "../lib";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;
  export let playerToggle = true;

  let play = false;
  let volume = 50;
  const setVolume = (value: number) => (): void => {
    send("playerVolume", (volume = +value), true);
  };
  const onSetVolume = (e: any): void => {
    setVolume(+e.target.value)();
  };
  let seek = 50;
  const onSetPosition = (e: any): void => {
    const value = +e.target.value;
    send("playerSeek", (seek = value), true);
  };

  const onMessage = (cmd: string, data: any): void => {
    // console.log("Player ws: ", cmd, data);
    switch (cmd) {
      case "playerStat":
        play = data.play;
        volume = data.volume;
        seek = data.seek;
        break;
    }
  };
  $: ws && wsOnMessage(ws, onMessage);

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      // player
      case "#playerPrev":
        send("playerPrev");
        clearLocationHash();
        break;
      case "#playerPause":
        play = !play;
        send("playerPause");
        clearLocationHash();
        break;
      case "#playerNext":
        send("playerNext");
        clearLocationHash();
        break;
      case "#playerVolumeMin":
        setVolume(0)();
        clearLocationHash();
        break;
      case "#playerVolumeMax":
        setVolume(100)();
        clearLocationHash();
        break;
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  +if('playerToggle')
    div.border-bottom(transition:slide!="{{ duration: 250 }}")
      div.container.py-1
        div.row.pt-1
          div.col-auto.pe-1
            //- prev
            a.btn.rounded-circle.p-0.text-primary(
              href="#playerPrev" title="Previous track"
              )
              +iconPlayerPrev
            //- play
            a.btn.rounded-circle.p-0.mx-1.text-primary(
              href="#playerPause" title="Play / pause"
              )
              +if('play')
                span: +iconPlayerPause
                +else
                  span: +iconPlayerPlay
            //- next
            a.btn.rounded-circle.p-0.text-primary(
              href="#playerNext" title="Next track"
              )
              +iconPlayerNext

          //- volume
          div.col.ps-0: div.d-flex.w-100.h-100.align-items-center
            div.form-group.w-100
              div.input-group.input-group-sm.border.bg-transparent.rounded-pill
                //- volume min
                a.btn.btn-primary.rounded-circle.p-0(
                  href="#playerVolumeMin" title="Mute"
                  style="width:2em;height:2em;transform:scale(0.875)"
                  )
                  span(style="line-height:1.725"): +iconPlayerVolume0
                //- volume range
                div.form-control.bg-transparent.border-0.px-2: div.position-relative
                  div.position-absolute.start-0.end-0(style="top:-0.125em")
                    input.form-range(type="range" value!="{volume}")
                    div.position-absolute.w-100.h-100(style="top:-15%")
                      input.w-100.h-100.opacity-0(
                      style="cursor:pointer"
                      type="range", min="0" max="100", step="5" 
                      on:input!="{onSetVolume}" 
                      title!="{volume}%"
                      )
                //- volume max
                a.btn.btn-primary.rounded-circle.p-0(
                  href="#playerVolumeMax" title="Max volume"
                  style="width:2em;height:2em;transform:scale(0.875)"
                  )
                  span(style="line-height:1.725"): +iconPlayerVolume100
        //- seek
        div.row
          div.position-relative.py-1.mt-1
            div.progress.rounded-pill(style="height:1em")
              div.progress-bar.bg-danger.progress-bar-striped(
                style!="width:{seek}%" 
                aria-valuemin="0" aria-valuemax="100", role="progressbar"
                class:progress-bar-animated!="{play}"
                class:bg-secondary!="{!play}"
                class:bg-danger!="{play}"
                aria-valuenow!="{seek}"
                )
            div.position-relative.w-100(style="top:-150%")
              div.position-absolute.start-0.end-0.top-0.bottom-0(style="height:1.5em")
                input.w-100.h-100.opacity-0(
                  style="cursor:pointer"
                  type="range", min="0" max="100", step="1" 
                  on:input!="{onSetPosition}" 
                  title!="{seek}%"
                  )
</template>
