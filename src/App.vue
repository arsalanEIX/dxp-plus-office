<template>
  <div class="max-w-lg w-96 h-full mx-auto font-sans flex flex-col p-2 mt-4">
    <img class="w-auto h-12 mx-auto" src="https://panel.dxp.plus/badge.png"/>
    <div v-if="openSettings">
      <div class="font-semibold text-lg text-blue-900 mb-4 mt-2">
        Settings
      </div>
      <div class="mb-4 text-sm">
        <div class="font-semibold text-blue-700">Panel Type</div>
        <input class="w-full outline-none border border-blue-700 p-2 my-1 text-xs rounded-sm" v-on:change="settingsChanged = true" placeholder="Enter Panel Type ..." v-model="panelType" />
      </div>
      <div class="mb-4 text-sm">
        <div class="font-semibold text-blue-700">Connection Key</div>
        <input class="w-full outline-none border border-blue-700 p-2 my-1 text-xs rounded-sm" v-on:change="settingsChanged = true" placeholder="Enter Connection Key ..." v-model="connectionKey" />
      </div>
      <div class="justify-center flex flex-row">
        <button
          v-if="settingsChanged"
          class="bg-blue-700 p-1 my-1 w-20 text-xs text-white rounded-sm"
          :class="{ 'cursor-pointer hover:bg-blue-800': saveEnabled, 'opacity-50 cursor-not-allowed': !saveEnabled }"
          :disabled="!saveEnabled"
          v-on:click="savePanelSettings"
        >
          Save
        </button>

        <button v-if="!settingsChanged" class="border border-blue-700 hover:bg-blue-50 p-1 my-1 w-20 text-xs text-blue-700 rounded-sm" v-on:click="toggleSettingsForm">Cancel</button>
      </div>
    </div>

    <div v-else>
      <div class="font-semibold text-center text-sm text-blue-900 my-6"></div>
      <div class="justify-evenly flex flex-row flex-wrap">
        <button class="bg-blue-700 hover:bg-blue-800 p-2 my-1 w-32 text-xs text-white rounded-sm" v-on:click="openDialog">Add Assets</button>
        <button class="bg-blue-700 hover:bg-blue-800 p-2 my-1 w-32 text-xs text-white rounded-sm" v-on:click="validateAssets">Update to Latest</button>
        <button class="border border-blue-700 hover:bg-blue-50 p-1 my-1 mt-8 w-32 text-xs text-blue-700 rounded-sm" v-on:click="toggleSettingsForm">Settings</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, h } from 'vue'

import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

const panelType = ref('')
const connectionKey = ref('')
const panelSettings = computed(() => {
  return { panelType: panelType.value, connectionKey: connectionKey.value }
})

const openSettings = ref(false)
const settingsChanged = ref(false)
const toggleSettingsForm = () => {
  openSettings.value = !openSettings.value
  settingsChanged.value = false
}

const saveEnabled = computed(() => connectionKey.value != '' && panelType.value != '')

const isVerifying = ref(false)

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const parseStoryLinkConfig = (configStr) => {
  let configObj = {}

  configStr = configStr.replaceAll('window.STORYLINK_', '-----STORYLINK_')
  configStr.split('-----').forEach((p) => {
    let [key, val] = p.split('=')
    if (key && key.trim() && val && val.trim())
      try {
        key = key.trim()
        val = val.trim()

        if (val.endsWith(';')) val = val.substring(0, val.length - 1)

        if (val.startsWith(`'`) || val.startsWith(`"`)) val = val.substring(1)
        if (val.endsWith(`'`) || val.endsWith(`"`)) val = val.substring(0, val.length - 1)

        if (val.startsWith(`{`) && val.endsWith(`}`)) val = JSON.parse(val)
        else if (val == 'true') val = true
        else if (val == 'false') val = false
        else if (val == 'undefined') val = undefined
        else if (val == 'null') val = null

        configObj[key] = val
      } catch (e) {
        console.log(`Problem in processing key ${key} .. ${e}`)
      }
  })

  return configObj
}

const verifyPanelConfigs = async () => {
  try {
    if (!['otmm', 'storylink'].includes(panelSettings.value.panelType)) throw 'Invalid Panel Type'

    const response = await fetch(`https://panel-settings.dxp.plus/${panelSettings.value.connectionKey}`, { method: 'GET', redirect: 'follow' })

    if (response.status != 200) throw `Cannot load the configs for the connection key [${panelSettings.value.connectionKey}]`
    else {
      const result = await response.text()

      if (panelSettings.value.panelType == 'storylink') {
        const parserConfigResponse = parseStoryLinkConfig(result)
        console.log('parserConfigResponse', parserConfigResponse)
      } else {
        const parserConfigResponse = JSON.parse(JSON.parse(result))
        console.log('parserConfigResponse', parserConfigResponse)
      }
    }

    localStorage.setItem('panelSettings', JSON.stringify(panelSettings.value))

    toast('Settings saved.', {
      theme: 'dark',
      position: 'bottom-center',
      type: 'info',
      autoClose: true,
    })

    toggleSettingsForm()
  } catch (error) {
    toast(`${error}`, {
      theme: 'dark',
      position: 'bottom-center',
      type: 'error',
      autoClose: false,
    })
  }
}

const savePanelSettings = async () => {
  if (panelSettings.value?.connectionKey || panelSettings.value?.panelType) {
    await verifyPanelConfigs()
  }
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

onMounted(async () => {
  const tmpSettings = JSON.parse(localStorage.getItem('panelSettings'))
  if (tmpSettings?.panelType) panelType.value = tmpSettings.panelType
  if (tmpSettings?.connectionKey) connectionKey.value = tmpSettings.connectionKey

  if (!panelSettings.value?.connectionKey || !panelSettings.value?.panelType) toggleSettingsForm()
})

// ------ ------ ------ ------ ------ ------ ------ ------ ------

let selCount, selTypes

const showPanelPopup = () => {
  // Check if popup Window is open
  // if (window.panelPopupWin) {
  //   return { alreadyOpen: true }
  // }

  if (window.panelPopupWin) window.panelPopupWin.close()
  window.panelPopupWin = undefined

  // Get Params .. Instance params will take precedense if provided
  let { panelType, connectionKey, selectionCount, selectionTypes, panelUrl, settingsUrl } = panelSettings.value
  {
    if (!selectionCount) selectionCount = 5
    if (!selectionTypes) selectionTypes = 'image, video, document'

    if (selectionTypes && !Array.isArray(selectionTypes)) {
      selectionTypes = selectionTypes
        .split(',')
        .filter((x) => x)
        .map((x) => `${x}`.trim().toLowerCase())
    }
  }

  // Set global props
  selCount = selectionCount || 5
  selTypes = selectionTypes || []

  return {
    panelType,
    connectionKey,
    selectionCount,
    selectionTypes,
    settingsUrl,
  }
}

const openDialog = async (_currentValue, _config, isValidating) => {
  const panelInfo = showPanelPopup()

  // TODO: cosnt _currentValue ... get a list of all current image/video/doc in the Office docs/xlsx/pptx

  if (panelInfo.alreadyOpen !== true) {
    const panelPopupListener = async (args) => {
      const event = JSON.parse(args.message)
      const { type } = event.data

      if (type === 'to.plugin.info') {
        const msg = { type: 'from.plugin.info', panelInfo }
        if (panelInfo.panelType === 'storylink') {
          delete msg.panelInfo
          msg.storyLinkInfo = { ...panelInfo }
        }
        window.panelPopupWin.messageChild(JSON.stringify(msg))
      }

      if (type === 'to.plugin.ready') {
        const { appConfig } = event.data
        if (appConfig) window.panelPopupConfigs = { ...appConfig }
      }

      if (type === 'to.plugin.app.closed') {
        if (window.panelPopupWin) window.panelPopupWin.close()
        window.panelPopupWin = undefined
      }

      if (type === 'to.plugin.assets.place') {
        const { assets } = event.data

        if (!assets || !assets.length) {
          toast('No content was selected.', {
            theme: 'dark',
            position: 'bottom-center',
            type: 'error',
            autoClose: true,
          })

          return
        }

        // Add assets to the new field value
        let currentFieldValue = [] // TODO: cosnt currentAssets ... get a list of all current image/video/doc in the Office docs/xlsx/pptx

        let newFieldValue = []
        assets.reverse().forEach(async (asset) => {
          // check for selection type
          if (asset.previewType && !selTypes.includes(`${asset.previewType}`.toLowerCase())) {
            toast(`[ ${asset.filename} ] - Invalid Type [${asset.previewType}]`, {
              theme: 'dark',
              position: 'bottom-center',
              type: 'warn',
              autoClose: true,
            })
            return
          }

          if (currentFieldValue.find((a) => a.versionId === asset.versionId)) {
            toast(`[ ${asset.filename} ] - Already added to the list`, {
              theme: 'dark',
              position: 'bottom-center',
              type: 'warn',
              autoClose: true,
            })
            return
          } else newFieldValue.push(asset)
        })

        // Merge with current .. slice up to the selCount if given
        newFieldValue = [...newFieldValue, ...currentFieldValue].slice(0, selCount > 0 ? selCount : undefined)
        debugger

        // Set the new value
        // TODO: Place each image/video from "newFieldValue" in the docx/xlsx/pptx
      }
    }

    let __thePanelUrl = `${window.origin}/get-panel?panelType=${panelInfo.panelType}`

    Office.context.ui.displayDialogAsync(__thePanelUrl, { height: 70, width: 30 }, (asyncResult) => {
      if (window.panelPopupWin) window.panelPopupWin.close()

      if (asyncResult.error) {        
        toast(asyncResult.error.message, {
          theme: 'dark',
          position: 'bottom-center',
          type: 'error',
          autoClose: true,
        })
        return
      }

      window.panelPopupWin = asyncResult.value
      window.panelPopupWin.addEventHandler(Office.EventType.DialogMessageReceived, panelPopupListener)
    })
  }

  return !isValidating ? _currentValue : { ...panelInfo, alreadyOpen: panelInfo.alreadyOpen === true }
}

async function validateAssets() {
  // Check if there is anthing to validate

  const currentAssets = [] // TODO: cosnt currentAssets ... get a list of all current image/video/doc in the Office docs/xlsx/pptx
  if (!currentAssets.length) {
    toast('There are no assets availalbe.', {
      theme: 'dark',
      position: 'bottom-center',
      type: 'warn',
      autoClose: true,
    })

    return
  }

  // Sender method for validate request
  const sendValidateRequest = () => {
    if (window.panelPopupWin) {
      isVerifying.value = true
      window.panelPopupWin.messageChild(JSON.stringify({ type: 'from.plugin.assets.validate', versionIds: currentAssets.map((e) => e.versionId) }))
    }
  }

  // Setup the listener for validation events
  const validationPopupListener = async (event) => {
    const { type } = event.data

    if (type === 'to.plugin.ready') {
      const { appConfig } = event.data
      if (appConfig) window.panelPopupConfigs = { ...appConfig }
      sendValidateRequest()
    }

    if (type === `to.plugin.assets.validated`) {
      try {
        const { assets } = event.data
        if (!assets || !assets.length) {
          toast('No assets were provided.', {
            theme: 'dark',
            position: 'bottom-center',
            type: 'error',
            autoClose: true,
          })
          // Notification.setPlacement('bottom', { offset: 0 })
          // Notification.error(`No assets were provided.`)
        } else {
          const newFieldValue = assets.filter((asset) => asset.previewType && selTypes.includes(`${asset.previewType}`.toLowerCase())).slice(0, selCount > 0 ? selCount : undefined)
          // TODO: Place each image/video from "newFieldValue" in the docx/xlsx/pptx
        }
      } finally {
        isVerifying.value = false
        window.removeEventListener('message', validationPopupListener)
      }
    }

    if (type === 'to.plugin.app.closed') {
      if (window.panelPopupWin) window.panelPopupWin.close()
      window.panelPopupWin = undefined
    }
  }
  window.removeEventListener('message', validationPopupListener)
  window.addEventListener('message', validationPopupListener)

  const { alreadyOpen } = await openDialog(null, null, true)
  if (alreadyOpen === true) sendValidateRequest()
}
</script>

<style>
.pnlBtn {
  @apply px-4 py-[.1rem] mx-4 mt-2 cursor-pointer rounded-md leading-6 tracking-wider text-xs text-white bg-blue-900  hover:bg-blue-950;
}

.pnlBtnOutline {
  @apply px-4 py-[.1rem] mx-4 mt-2 cursor-pointer rounded-md leading-6 tracking-wider text-xs border border-blue-950 text-blue-900 hover:text-blue-950;
}
</style>
