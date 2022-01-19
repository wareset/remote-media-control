<script lang="ts">
  import { fade } from "svelte/transition";

  import { clearLocationHash } from "../lib";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;

  export let modalMoreToggle: boolean;
  $: modalMoreToggle && send("routerGet");

  let router: string = "";
  let port: number | string = +location.port;
  port = !port || port === 80 ? "" : ":" + port;

  const onOpen = (): void => {
    if (modalMoreToggle) send("routerGet");
  };
  const onMessage = (cmd: string, data: any): void => {
    // console.log("ModalMore ws: ", cmd, data);
    switch (cmd) {
      case "router":
        router = data;
        break;
    }
  };
  $: ws && (wsOnOpen(ws, onOpen), wsOnMessage(ws, onMessage));

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      // more
      case "#playlistClear":
        modalMoreToggle = false;
        send("playlistClear");
        clearLocationHash();
        break;
      case "#exit":
        modalMoreToggle = false;
        send("exit");
        clearLocationHash();
        break;
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  +if('modalMoreToggle')
    div.modal.d-block(aria-modal="true" role="dialog" 
      style="background-color:rgba(10,0,0,0.75)" 
      transition:fade!="{{ duration: 250 }}"
      )
      a.position-absolute.w-100.h-100(
        href="#modalMoreToggle"
        ) 
      div.modal-dialog.modal-dialog-centered.modal-dialog-scrollable.modal-sm
        div.modal-content
          div.modal-header.pt-2.pb-1: div
            div.small Адрес в сети:
            +if('router')
              div.font-monospace http://{router}{port}
              +else
                div.font-monospace РОУТЕР НЕ НАЙДЕН
          div.modal-body.d-flex.flex-column.justify-content-between
            a.btn.btn-warning.mb-3.text-uppercase(
              href="#playlistClear"
              ) Очистить плейлист
            a.btn.btn-success.mb-3.text-uppercase(
              href="#modalSettingsToggle"
              ) Открыть настройки
            a.btn.btn-danger.text-uppercase(
              href="#exit"
              ) Закрыть программу
          div.modal-footer.justify-content-between
            a.btn.btn-sm.btn-info.text-uppercase(
              href="#modalAboutToggle"
              ) О программе
            a.btn.btn-sm.btn-secondary.text-uppercase(
              href="#modalMoreToggle"
              ) Отменить
</template>
