<script lang="ts">
  import { isDEV, last } from "../lib";
  import { clearLocationHash } from "../lib";
  import { TAB_LIBRARY } from "../lib/consts";
  import { wsOnOpen, wsOnMessage, wsOnClose } from "../lib";

  export let ws: WebSocket;
  export let api: Function[];
  export let send: Function;
  export let tabCurrent: number;

  let libraryNeedUpdate = true;
  let libraryUL: HTMLElement | undefined;
  let library = {
    id: -1,
    path: [],
    list: isDEV
      ? [...Array(20)].map((v, k) => ({
          id: k,
          type: k % 3 ? "d" : "f",
          name: "Item " + k,
        }))
      : [],
  };

  const onOpen = (): void => {
    if (libraryNeedUpdate) {
      send("library", {
        id: library.id,
        path: library.path,
      });
    }
  };
  const OnClose = (): void => {
    libraryNeedUpdate = true;
  };
  const onMessage = (cmd: string, data: any): void => {
    // console.log("Library ws: ", cmd, data);
    switch (cmd) {
      case "library":
        library = data;
        libraryNeedUpdate = false;
        break;
      case "libraryChange":
        send("library", {
          id: library.id,
          path: library.path,
        });
        break;
    }
  };
  $: ws && (wsOnOpen(ws, onOpen), wsOnMessage(ws, onMessage), wsOnClose(ws, OnClose));

  api.push((hashArr: string[]): void => {
    switch (hashArr[0]) {
      // library
      case "#libraryPath":
        send("library", {
          id: library.id,
          path: library.path.slice(0, +hashArr[1] + 1 || 0),
        });
        clearLocationHash();
        break;
      case "#libraryBack":
        send("library", {
          id: library.id,
          path: library.path.slice(0, -1),
        });
        clearLocationHash();
        break;
      case "#libraryOpen": {
        const id = +hashArr[1];
        const key = +hashArr[2];
        const name = library.list[key].name;
        const isDir = library.list[key].type === "d";
        if (isDir) {
          send("library", {
            id,
            path: [...library.path, name],
          });
        }
        clearLocationHash();
        break;
      }
      case "#libraryAppend": {
        const id = +hashArr[1];
        const key = +hashArr[2];
        const name = library.list[key].name;
        send("playerAppendFile", {
          id,
          path: [...library.path, name],
        });
        if (libraryUL) {
          const li = libraryUL.children[key + 1];
          if (li) li.classList.add("text-success");
        }
        break;
      }
    }
  });
</script>

<template lang="pug">
  include ../templates/icons

  div.card.position-absolute.w-50.h-100.top-0.end-0.overflow-hidden.d-flex.flex-column(
      class:d-none!="{tabCurrent !== TAB_LIBRARY}"
    )
    +key('library')
      div.position.relative.w-100.border-bottom(
        style="overflow-x:scroll;overflow-y:hidden" 
        class:d-none!="{library.id < 0}"
        )
        div.text-nowrap.d-flex.align-items-center.px-2.py-1(style="margin-bottom:0.25em")
          a.p-2(
            href="#libraryPath::-1" title="Home"
            )
            +iconLibraryHome
          +each('library.path.slice(0, -1) as v, k')
            span.p-1.text-secondary /
            a.p-2(
              href!="#libraryPath::{k}"
              ) {v}
          span
            span.p-1.text-secondary /
            span.p-2 {last(library.path)}

      div.position-relative.w-100.h-100(style="overflow-y:scroll;overflow-x:hidden")
        ul.list-group.list-group-flush(bind:this="{libraryUL}")
          li.list-group-item.list-group-item-action.p-0(class:d-none!="{library.id < 0}")
            div.row.align-items-center.m-0
              a.col.d-flex.align-items-center.text-decoration-none.p-1.text-primary(
                href="#libraryBack"
                )
                span.btn.text-secondary: +iconLibraryBack
                span.lh-sm.text-secondary(style="margin-bottom:-0.125em") [ .. ]
              
          +each('library.list as v, k')
            li.list-group-item.list-group-item-action.p-0
              div.row.align-items-center.m-0
                a.col.d-flex.align-items-center.text-decoration-none.py-1.ps-0.pe-0(
                  style!="color:inherit;cursor:{ v.type === 'd' ? 'pointer' : 'default' }"
                  href!="#libraryOpen::{v.id}::{k}"
                  )
                  +if('v.type === "d"')
                    span.px-3: +iconLibraryFolder
                    +else
                      span.px-3: +iconLibraryFile
                  span.lh-sm.text-break(style="margin-bottom:-0.125em") {v.name}
                a.col-auto.p-1(
                  href!="#libraryAppend::{v.id}::{k}"
                  )
                  span.btn.text-success: +iconLibraryAdd

</template>
