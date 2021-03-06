<template>
<div
  :class="{
    'veui-input': true,
    'veui-input-focused': focused,
    'veui-input-hidden': type === 'hidden',
    'veui-input-invalid': realInvalid,
    'veui-input-autofill': autofill,
    'veui-readonly': realReadonly,
    'veui-disabled': realDisabled
  }"
  :ui="realUi"
  v-on="containerListeners"
>
  <template v-if="$slots.before">
    <div class="veui-input-before">
      <slot name="before"/>
    </div>
  </template>
  <label class="veui-input-main">
    <span
      v-if="type !== 'hidden'"
      v-show="empty"
      class="veui-input-placeholder"
      @selectstart.prevent="() => false"
    >
      {{ placeholder }}
    </span>
    <input
      ref="input"
      v-model="localValue"
      class="veui-input-input"
      v-bind="attrs"
      v-on="inputListeners"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
      @compositionupdate="handleComposition"
      @compositionend="handleCompositionEnd"
      @change="$emit('change', $event.target.value, $event)"
    >
  </label>
  <span
    v-if="clearable"
    v-show="editable && !empty"
    class="veui-input-clear"
  >
    <button
      type="button"
      :aria-label="t('clear')"
      class="veui-input-clear-button"
      @click.stop="clear"
    >
      <veui-icon :name="icons.remove"/>
    </button>
  </span>
  <template v-if="$slots.after">
    <div class="veui-input-after">
      <slot name="after"/>
    </div>
  </template>
</div>
</template>

<script>
import ui from '../mixins/ui'
import input from '../mixins/input'
import activatable from '../mixins/activatable'
import i18n from '../mixins/i18n'
import { includes, pick } from 'lodash'
import Icon from './Icon'
import { MOUSE_EVENTS, KEYBOARD_EVENTS, FOCUS_EVENTS } from '../utils/dom'

const TYPE_LIST = ['text', 'password', 'hidden']

export default {
  name: 'veui-input',
  components: {
    'veui-icon': Icon
  },
  mixins: [ui, input, activatable, i18n],
  inheritAttrs: false,
  props: {
    ui: String,
    type: {
      type: String,
      default: 'text',
      validator (val) {
        return includes(TYPE_LIST, val)
      }
    },
    placeholder: String,
    value: {
      type: [String, Number],
      default: ''
    },
    selectOnFocus: Boolean,
    composition: Boolean,
    clearable: Boolean
  },
  data () {
    return {
      focused: false,
      localValue: this.value == null ? '' : this.value,
      compositionValue: null,
      autofill: false
    }
  },
  computed: {
    attrs () {
      return {
        ...this.$attrs,
        type: this.type,
        name: this.realName,
        disabled: this.realDisabled,
        readonly: this.realReadonly
      }
    },
    inputListeners () {
      return pick(this.$listeners, [...KEYBOARD_EVENTS, ...FOCUS_EVENTS])
    },
    containerListeners () {
      return pick(this.$listeners, MOUSE_EVENTS)
    },
    editable () {
      return !this.realDisabled && !this.realReadonly
    },
    empty () {
      // compositionValue 不会是数字 0
      return (
        !this.compositionValue && (this.value == null || this.value === '')
      )
    },
    realSelectOnFocus () {
      return this.type !== 'hidden' && this.selectOnFocus
    }
  },
  watch: {
    value (val) {
      if (val == null) {
        this.localValue = ''
        this.$emit('input', '')
      } else {
        this.localValue = val
      }
    },
    autofill (val) {
      if (val) {
        this.$emit('autofill')
      }
    }
  },
  methods: {
    handleInput ($event) {
      try {
        setTimeout(() => {
          this.autofill = !!this.$el.querySelector(':-webkit-autofill')
        })
      } catch (e) {}

      // 分2种情况
      // 1. 感知输入法，触发原生 input 事件就必须向上继续抛出
      // 2. 不感知输入法，在没有输入法状态的值的情况下需要向上抛出
      //
      // compositionupdate -> compositionend -> input
      if (this.composition || !this.compositionValue) {
        this.$emit('input', $event.target.value, $event)
      }
    },
    handleComposition ($event) {
      this.compositionValue = $event.data
    },
    handleCompositionEnd () {
      this.compositionValue = ''
    },
    handleFocus ($event) {
      this.focused = true

      if (this.realSelectOnFocus && $event.target) {
        $event.target.select()
      }
    },
    handleBlur () {
      this.focused = false
    },
    focus () {
      this.$refs.input.focus()
    },
    activate () {
      if (this.realDisabled || this.realReadonly) {
        return
      }
      this.focus()
    },
    clear () {
      this.localValue = ''
      this.compositionValue = ''
      this.focus()
      this.$emit('input', '')
    }
  }
}
</script>
