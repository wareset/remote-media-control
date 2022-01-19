<script lang="ts">
  import { fade } from "svelte/transition";

  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;

  let isSuccess = false;
  let message = "";
  let messageCTO: any;
  const hideError = () => {
    message = "";
  };

  const onMessage = (cmd: string, data: any): void => {
    // console.log("ModalError ws: ", cmd, data);
    switch (cmd) {
      case "messageSuccess":
        isSuccess = true;
        message = data;
        clearTimeout(messageCTO);
        messageCTO = setTimeout(hideError, 2500);
        break;
      case "messageError":
        isSuccess = false;
        message = data;
        clearTimeout(messageCTO);
        messageCTO = setTimeout(hideError, 2500);
        break;
    }
  };
  $: ws && wsOnMessage(ws, onMessage);
</script>

<template lang="pug">
  include ../templates/icons

  +if('message')
    div.modal.d-block.h-auto(role="alert"
      style="top:2.5em"
      transition:fade!="{{ duration: 250 }}"
      ): div.container.py-2
      pre.alert(style="white-space:pre-wrap"
        class:alert-danger!="{!isSuccess}"
        class:alert-success!="{isSuccess}"
        ) {message}
</template>
