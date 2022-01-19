<script lang="ts">
  import { fade } from "svelte/transition";

  import { clearLocationHash } from "../lib";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;

  export let modalSettingsToggle: boolean;

  let config: any;

  let port = 80;
  let player: string;
  let vlc: string;
  let vlcIsValid: boolean | null;
  let mpv: string;
  let mpvIsValid: boolean | null;
  let library: string;

  $: config = (modalSettingsToggle, null);
  $: if (config) vlcIsValid = vlc === config.vlc ? config.vlcIsValid : null;
  $: if (config) mpvIsValid = mpv === config.mpv ? config.mpvIsValid : null;
  $: textareaHeight = (!library ? 1 : library.split("\n").length || 1) + 2;

  const onOpen = (): void => {
    if (modalSettingsToggle) send("settingsGet");
  };
  const onClose = (): void => {
    config = null;
  };
  const onMessage = (cmd: string, data: any): void => {
    // console.log("ModalSettings ws: ", cmd, data);
    switch (cmd) {
      case "settings":
        port = data.port;
        player = data.player;
        vlc = data.vlc;
        vlcIsValid = data.vlcIsValid;
        mpv = data.mpv;
        mpvIsValid = data.mpvIsValid;
        library = data.library.join("\r\n");

        config = data;
        break;
      case "settingsCheckVlc":
        vlcIsValid = data;
        break;
      case "settingsCheckMpv":
        mpvIsValid = data;
        break;
    }
  };
  $: ws &&
    (wsOnOpen(ws, onOpen), wsOnClose(ws, onClose), wsOnMessage(ws, onMessage));

  const onSettingsCheckVlc = (): void => {
    if (vlc) send("settingsCheckVlc", vlc);
    else vlcIsValid = false;
  };
  const onSettingsCheckMpv = (): void => {
    if (mpv) send("settingsCheckMpv", mpv);
    else mpvIsValid = false;
  };

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      case "#settingsCheckVlc":
        onSettingsCheckVlc();
        clearLocationHash();
        break;
      case "#settingsCheckMpv":
        onSettingsCheckMpv();
        clearLocationHash();
        break;
      case "#settingsSet":
        if (config && modalSettingsToggle)
          send("settingsSet", { port, player, vlc, mpv, library });
        modalSettingsToggle = false;
        clearLocationHash();
        break;
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  +if('modalSettingsToggle')
    div.modal.d-block(aria-modal="true" role="dialog" 
      style="background-color:rgba(0,10,0,0.75)" 
      transition:fade!="{{ duration: 250 }}"
      )
      div.modal-dialog.modal-dialog-centered.modal-dialog-scrollable.modal-lg2(
        transition:fade!="{{ duration: 250 }}"
        )
        div.modal-content
          div.modal-header.pt-2.pb-1: b.fs-5 Настройки конфигурации:
          +if('config || send("settingsGet")')
            div.modal-body
              form.text-break

                //- PORT
                div.row
                  div.col
                    div.form-floating
                      input#settings-port.form-control.is-valid(
                        type="number" placeholder="80"
                        bind:value!="{port}"
                      )
                      label.text-nowrap(for="settings-port") Порт для запуска:

                div.small.pt-2.font-monospace.text-muted
                  div Например, указав 3000, ссылка будет:
                  div.small
                    mark http://localhost:3000
                  div Если указать порт 80, то достаточно:
                  div.small
                    mark http://localhost
                  div.small При ошибке порт назначается автоматически

                hr

                //- Select VLC or MPV
                //- div.form-floating.mb-2
                  select#settings-player.form-select(
                    aria-label="Выберите плеер VLC или MPV"
                    bind:value!="{player}"
                    )
                    option(value="vlc") vlc
                    option(value="mpv") mpv
                  label.text-nowrap(for="settings-player") Выбранный плеер:

                //- command VLC
                +if('player === "vlc"')
                  div.small.pb-2.font-monospace.text-muted
                    div.small Если VLC не установлен на компьютере, то:
                    div
                      span ссылка на vlc:&nbsp;
                      a.small(
                        href="https://www.videolan.org"
                        target="_blank" 
                        ) https://www.videolan.org
                  div.row
                    div.col
                      div.form-floating
                        input#settings-vlc.form-control(
                          type="text" placeholder="vlc"
                          class:is-invalid!="{vlcIsValid === false}"
                          class:is-valid!="{vlcIsValid === true}"
                          on:change!="{onSettingsCheckVlc}"
                          bind:value!="{vlc}"
                          )
                        label.text-nowrap(for="settings-vlc") Команда/путь для запуска "vlc":
                    div.col-auto.ps-0
                      a.btn.h-100.d-flex.align-items-center.text-warning.p-0(
                        href="#settingsCheckVlc"
                        )
                        +iconSettingsUpdate
                  div.small.pt-2.font-monospace.text-muted
                    div В Windows, скорее всего, путь будет:
                    div.small
                      mark C:\Program Files\VideoLAN\VLC\vlc.exe

                    div В Linux попробуйте ввести следующее:
                    div.small
                      mark vlc
                      span , 
                      mark /usr/bin/vlc
                      span , 
                      mark /usr/local/bin/vlc
                    
                    div В MacOS, возможно, путь будет таким:
                    div.small
                      mark /Applications/VLC.app/Contents/MacOS/VLC
                
                //- command PMV
                +if('player === "mpv"')
                  div.small.pb-2.font-monospace.text-muted
                    div.small Если MPV не установлен на компьютере, то:
                    div
                      span mpv:&nbsp;
                      a.small(
                        href="https://mpv.io/installation/"
                        target="_blank" 
                        ) https://mpv.io/installation
                  div.row
                    div.col
                      div.form-floating
                        input#settings-mpv.form-control(
                          type="text" placeholder="mpv"
                          class:is-invalid!="{mpvIsValid === false}"
                          class:is-valid!="{mpvIsValid === true}"
                          on:change!="{onSettingsCheckMpv}"
                          bind:value!="{mpv}"
                          )
                        label.text-nowrap(for="settings-mpv") Команда/путь для запуска "mpv":
                    div.col-auto.ps-0
                      a.btn.h-100.d-flex.align-items-center.text-warning.p-0(
                        href="#settingsCheckMpv"
                        )
                        +iconSettingsUpdate
                  div.small.pt-2.font-monospace.text-muted
                    div В Windows нужен полный путь. Пример:
                    div.small
                      mark C:\Program Files\mpv\mpv.exe

                    div В Linux попробуйте ввести следующее:
                    div.small
                      mark mpv
                      span , 
                      mark /usr/bin/mpv
                      span ,  
                      mark /usr/local/bin/mpv
                    
                    div В MacOS, возможно, путь будет таким:
                    div.small
                      mark /Applications/mpv.app/Contents/MacOS/mpv

                hr

                div
                  div
                    label.text-nowrap.form-label(for="settings-library")
                      | Укажите каталоги, файлы, ярлыки:
                    textarea#settings-library.form-control(
                      placeholder="C:/example/absolute/path\r\n../../example/relative/path"
                      style!="line-height:1.375;height:{textareaHeight * 1.375}em"
                      bind:value!="{library}"
                      )
                    

                div.small.py-2.font-monospace.text-muted
                  div Пути можно указывать как "абсолютно"
                  div так и "относительно" файла программы
                  div В Linux и Mac разделитель только "/"
                  div В Windows будет работать и "\" и "/"
                  div -
                  div Примеры:
                  div.small
                    mark C:\music\rhcp 
                    span - абсолютный путь в Windows
                  div.small
                    mark /home/user/best 
                    span - абсолютный путь в Linux
                  div.small
                    mark ./kino/1.mp3 
                    span - относительный путь к файлу
                  div.small
                    mark ../../clips 
                    span - это тоже относительный путь

            div.modal-footer.p-1
              a.btn.btn-sm.btn-success.text-uppercase(
                href="#settingsSet"
                ) Сохранить
              a.btn.btn-sm.btn-secondary.text-uppercase(
                href="#modalSettingsToggle"
                ) Отменить

            +else
              div.modal-body.d-flex.align-items-center.justify-content-center(
                style="height:100vh"
                )
                div.spinner-grow.text-danger(role="status")
</template>
