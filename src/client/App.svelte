<script lang="ts">
  import { last, consoleLogDev, clearLocationHash } from "./lib";
  import { TAB_PLAYLIST, TAB_LIBRARY } from "./lib/consts";
  import { wsOnOpen, wsOnEvent, wsOnClose } from "./lib";

  import Header from "./components/Header.svelte";
  import Player from "./components/Player.svelte";
  import Tabs from "./components/Tabs.svelte";

  // Tabs
  import Playlist from "./components/Playlist.svelte";
  import Library from "./components/Library.svelte";

  // Modals
  import ModalMore from "./components/ModalMore.svelte";
  import ModalAbout from "./components/ModalAbout.svelte";
  import ModalMessage from "./components/ModalMessage.svelte";
  import ModalSettings from "./components/ModalSettings.svelte";

  import { fade } from "svelte/transition";
  import { onMount } from "svelte";

  // header
  let playerToggle = true;
  let headerTitle: [number, string] | null;
  const setHeaderTitle = (id: number, name?: string): void => {
    headerTitle = name ? [id, name] : null;
  };

  // Modals
  let modalMoreToggle = false;
  let modalAboutToggle = false;
  let modalSettingsToggle = false;

  // tabs
  let tabCurrent: typeof TAB_PLAYLIST | typeof TAB_LIBRARY = TAB_LIBRARY;

  let showSpinner = false;

  const api: Function[] = [
    (hashArr: string[]): void => {
      switch (hashArr[0]) {
        // header
        case "#playerToggle":
          playerToggle = !playerToggle;
          clearLocationHash();
          break;

        // modals
        case "#modalMoreToggle":
          modalMoreToggle = !modalMoreToggle;
          clearLocationHash();
          break;
        case "#modalAboutToggle":
          modalMoreToggle = false;
          modalAboutToggle = !modalAboutToggle;
          clearLocationHash();
          break;
        case "#modalSettingsToggle":
          modalMoreToggle = false;
          modalSettingsToggle = !modalSettingsToggle;
          clearLocationHash();
          break;

        // tabs
        case "#showPlaylist":
          tabCurrent = TAB_PLAYLIST;
          break;
        case "#showLibrary":
          tabCurrent = TAB_LIBRARY;
          break;
      }
    },
  ];

  const onHashChange = (): void => {
    const hash = location.hash;
    if (hash.length > 1) {
      const hashArr = hash.split("::");
      consoleLogDev("hash: ", hashArr);
      api.forEach((v) => v(hashArr));
    }
  };

  onHashChange();
  window.addEventListener("hashchange", onHashChange);

  let ws: WebSocket;
  // let queue: [string, any, any][] = [];
  let isReady = false;
  let isWebsocket = false;
  const send = (cmd: string, data?: any, notSpinner?: boolean): void => {
    consoleLogDev("send: ", cmd, data);
    consoleLogDev("json: ", JSON.stringify({ cmd, data }));
    if (isWebsocket) {
      // if (!notSpinner) {
      //   showSpinner = true;
      //   setTimeout(() => (showSpinner = false), 2500);
      // }
      ws.send(JSON.stringify({ cmd, data }));
    } else {
      // queue = queue.filter((v) => v[0] !== cmd);
      // queue.push([cmd, data, notSpinner]);
    }
  };

  const wsConnect = () => {
    isWebsocket = false;
    isReady = false;
    ws = new WebSocket("ws://" + location.host);

    wsOnOpen(ws, () => {
      consoleLogDev("WebSocket open");
      isWebsocket = true;
      // @ts-ignore
      // while (queue.length) send(...queue.shift());
    });

    wsOnClose(ws, () => {
      consoleLogDev("WebSocket close");
      isWebsocket = false;
      setTimeout(wsConnect, 2500);
    });

    wsOnEvent(ws, "error", () => {
      consoleLogDev("WebSocket error");
      ws.close();
    });
  };

  onMount(wsConnect);
</script>

<template lang="pug">
  include ./templates/icons

  //----------------------------------------------------------------------------
  //- APP
  //----------------------------------------------------------------------------
  div.d-flex.flex-column.position-absolute.w-100.h-100.start-0.top-0
    Header("{ws}" "{api}" "{send}" "{playerToggle}" "{headerTitle}")
    div.d-flex.flex-column.w-100.h-100
      Player("{ws}" "{api}" "{send}" "{playerToggle}")
      Tabs("{tabCurrent}")
      div.w-100.h-100.py-2
        div.container.h-100.overflow-hidden
          div.position-relative.h-100(
            style!="width:200%;transform:translate({tabCurrent === TAB_LIBRARY ? -50 : 0}%, 0);transition: transform ease 0.25s;"
            )
            Playlist("{ws}" "{api}" "{send}" "{tabCurrent}" "{setHeaderTitle}")
            Library("{ws}" "{api}" "{send}" "{tabCurrent}")

  //- modal MESSAGE
  ModalMessage("{ws}")

  //- modal MORE
  ModalMore("{ws}" "{api}" "{send}" bind:modalMoreToggle!="{modalMoreToggle}")
  
  //- modal ABOUT
  ModalAbout("{modalAboutToggle}")

  //- modal SETTINGS
  ModalSettings("{ws}" "{api}" "{send}" bind:modalSettingsToggle!="{modalSettingsToggle}")


  +if('!isWebsocket')
    div.modal.d-flex.align-items-center.justify-content-center.flex-column(
        style="background-color:rgba(0,0,0,0.25);" 
        transition:fade!="{{ duration: 250 }}"
      ) 
      div.pb-3(style="transform:scale(2)")
        div.spinner-border.text-danger(role="status") 
      b.fs-3.text-danger connection...



  //- +if('showSpinner')
    div.modal.d-flex.align-items-center.justify-content-center(
      style="background-color:rgba(0,0,0,0.25)" 
      transition:fade!="{{ duration: 250 }}"
      ) 
      div.spinner-grow.text-danger(role="status")



</template>
