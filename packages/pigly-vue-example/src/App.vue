<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    {{foo}}
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import HelloWorld from "./components/HelloWorld.vue";
import { IFoo } from "./service/_foo";
import { Inject } from "./decorators/inject";

@Component({
  components: {
    HelloWorld
  },
  inject: ["$kernel"]
})
export default class App extends Vue {
  @Inject<IFoo>()
  private foo!: IFoo;

  created() {}

  mounted() {}
}
</script>

<style lang="scss">
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
