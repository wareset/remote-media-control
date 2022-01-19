<script lang="ts">
  import { isDEV } from "../lib";
  import { clearLocationHash } from "../lib";
  import { TAB_PLAYLIST } from "../lib/consts";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;
  export let tabCurrent: string;
  export let setHeaderTitle: Function;

  let playlistNeedUpdate = true;
  let playlistUL: HTMLElement | undefined;
  let playlist = isDEV
    ? [...Array(20)].map((v, k) => ({
        id: k,
        current: k === 4,
        duration: k % 3 ? 1 : -1,
        name: "Item " + k,
      }))
    : [];

  const onOpen = (): void => {
    if (playlistNeedUpdate) send("playlistGet");
  };
  const onClose = (): void => {
    playlistNeedUpdate = true;
  };
  const onMessage = (cmd: string, data: any): void => {
    // console.log("Playlist ws: ", cmd, data);
    switch (cmd) {
      case "playlist":
        playlist = data;
        break;
    }
  };
  $: ws &&
    (wsOnOpen(ws, onOpen), wsOnMessage(ws, onMessage), wsOnClose(ws, onClose));

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      // playlist
      case "#playlistPlayById":
        send("playlistPlayById", +hashArr[1]);
        break;
      case "#playlistDeleteById":
        send("playlistDeleteById", +hashArr[1]);
        if (playlistUL) {
          const li = playlistUL.children[+hashArr[2]];
          if (li) li.classList.add("text-danger");
        }
        clearLocationHash();
        break;
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  div.card.position-absolute.w-50.h-100.top-0.start-0.overflow-hidden(
      class:d-none!="{tabCurrent !== TAB_PLAYLIST}"
    )
      div.position-absolute.w-100.h-100(style="overflow-y:scroll;overflow-x:hidden")
        ul.list-group.list-group-flush(bind:this="{playlistUL}")
          +key('playlist')
            +each('(setHeaderTitle(0), playlist) as v, k')
              li.list-group-item.list-group-item-action.p-0(
                class:active!="{v.current}"
                )
                div.row.align-items-center.m-0
                  a.col-auto.p-1(
                    href!="#playlistPlayById::{v.id}"
                    )
                    +if('+v.duration === -1')
                      span.btn.text-success: +iconPlaylistPlayFolder
                      +elseif('v.current')
                        span.btn.text-success: +iconPlaylistPlayCurrent
                        +else
                          span.btn.text-success: +iconPlaylistPlay
                  div.col.lh-sm.p-0(style="margin-bottom:-0.125em")
                    small.text-secondary.me-2 {k + 1}.
                    span.text-break {(v.current && setHeaderTitle(k + 1, v.name), v.name)}
                  a.col-auto.p-1(
                    href!="#playlistDeleteById::{v.id}::{k}"
                    )
                    span.btn.text-danger: +iconPlaylistDelete
</template>
