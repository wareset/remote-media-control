<script lang="ts">
  import { TAB_PLAYLIST, TAB_LIBRARY } from "../lib/consts";

  export let tabCurrent: number;
</script>

<template lang="pug">
  include ../templates/icons

  div.border-bottom: div.container.py-2
    div.btn-group.btn-group-sm.w-100(role="group")
      a.btn(
        href="#showPlaylist" title="View current playlist" 
        class:btn-secondary!="{tabCurrent !== TAB_PLAYLIST}" 
        class:btn-primary!="{tabCurrent === TAB_PLAYLIST}"
        )
        +iconTabsPlaylist
      a.btn(
        href="#showLibrary" title="View media library"
        class:btn-secondary!="{tabCurrent !== TAB_LIBRARY}" 
        class:btn-primary!="{tabCurrent === TAB_LIBRARY}"
        )
        +iconTabsLibrary
</template>
