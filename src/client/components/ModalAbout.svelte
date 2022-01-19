<script lang="ts">
  import { fade } from "svelte/transition";
  // @ts-ignore
  import { name, version, author, homepage, license } from "../../../package.json";

  export let modalAboutToggle: boolean
</script>

<template lang="pug">
  include ../templates/icons

  +if('modalAboutToggle')
    div.modal.d-block(aria-modal="true" role="dialog" 
      style="background-color:rgba(0,0,10,0.75)" 
      transition:fade!="{{ duration: 250 }}"
      )
      a.position-absolute.w-100.h-100(
        href="#modalAboutToggle"
        ) 
      div.modal-dialog.modal-dialog-centered.modal-dialog-scrollable
        div.modal-content
          div.modal-body.text-center
            b.fs-4 О программе
            div.font-monospace
              |version:&nbsp;{version}
              br
              |author:&nbsp;
              a(target="_blank" href!="mailto:{author.split(/[<>]/)[1]}") {author}
              br
              |homepage:&nbsp;
              a(target="_blank" href!="{homepage}") {name}
              br
              |license:&nbsp;{license}
          div.modal-footer
            a.btn.btn-sm.btn-secondary.text-uppercase(
              href="#modalAboutToggle"
              ) Отменить
</template>