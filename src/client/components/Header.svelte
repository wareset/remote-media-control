<script lang="ts">
  import { clearLocationHash } from "../lib";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;
  export let playerToggle = true;
  export let headerTitle: [number, string] | null;

  let loop = false;
  let random = false;
  let fullscreen = true;

  const onMessage = (cmd: string, data: any): void => {
    switch (cmd) {
      case "playerStat":
        loop = data.loop;
        random = data.random;
        fullscreen = data.fullscreen;
        break;
    }
  };
  $: ws && wsOnMessage(ws, onMessage);

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      // header
      case "#loopToggle":
        loop = !loop;
        send("playerLoop");
        clearLocationHash();
        break;
      case "#randomToggle":
        random = !random;
        send("playerRandom");
        clearLocationHash();
        break;
      case "#fullscreenToggle":
        fullscreen = !fullscreen;
        send("playerFullscreen");
        clearLocationHash();
        break;
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  div.bg-primary: div.container.py-1
    div.row
      //- Player
      div.col-auto.align-self-center
        a.btn.btn-sm.p-0(
          href="#playerToggle" title="Toggle player"
          class:text-secondary!="{!playerToggle}" 
          class:text-light!="{playerToggle}"
          )
          +iconPlayer

      //- Current track
      div.small.col.text-truncate.text-light.align-self-center.px-0 
        +if('headerTitle')
          small.text-secondary.me-2 {headerTitle[0]}.
          span {headerTitle[1]}

      //- Left block
      div.col-auto.align-self-center: div.btn-group.btn-group-sm.rounded-pill(style="background-color:#fff;border:2.5px solid #fff")
        //- loop
        a.btn.p-0.me-3.rounded-pill(
          href="#loopToggle" title="Toggle loop"
          class:btn-secondary!="{!loop}"
          class:btn-primary!="{loop}"
          )
          +iconLoop

        //- random
        a.btn.p-0.me-3.rounded-pill(
          href="#randomToggle" title="Toggle random"
          class:btn-secondary!="{!random}"
          class:btn-primary!="{random}"
          )
          +iconRandom

        //- fullscreen
        a.btn.p-0.me-3.rounded-pill(
          href="#fullscreenToggle" title="Toggle fullscreen"
          class:btn-secondary!="{!fullscreen}"
          class:btn-primary!="{fullscreen}"
          )
          +iconFullscreen

        //- modal info
        a.btn.p-0.rounded-pill.text-danger.opacity-50(
          href="#modalMoreToggle" title="Open modal for details"
          )
          +iconInfo
</template>
