<template>
  <div class="max-w-64 h-full mx-auto font-sans flex flex-col p-2 mt-4">
    <div v-if="openSettings">
      <div class="font-semibold text-lg text-blue-900 mb-6">Settings</div>
      <div class="mb-4 text-sm">
        <div class="font-semibold text-blue-700">Panel Type</div>
        <input class="outline-none border border-blue-700 p-2 my-1 text-xs rounded-sm" v-on:change="settingsChanged=true" placeholder="Enter Panel Type ..." v-model="panelType" />
      </div>
      <div class="mb-4 text-sm">
        <div class="font-semibold text-blue-700">Connection Key</div>
        <input class="outline-none border border-blue-700 p-2 my-1 text-xs rounded-sm" v-on:change="settingsChanged=true" placeholder="Enter Connection Key ..." v-model="connectionKey" />
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

        <button
          v-if="!settingsChanged"
          class="border border-blue-700 hover:bg-blue-50 p-1 my-1 w-20 text-xs text-blue-700 rounded-sm"
          v-on:click="toggleSettingsForm"
        >
          Cancel
        </button>        

      </div>
    </div>

    <div v-else>
      <div class="font-semibold text-lg text-blue-900 mb-6">DAM Assets</div>
      <div class="justify-center flex flex-col">
        <button class="bg-blue-700 hover:bg-blue-800 p-2 my-1 w-32 text-xs text-white rounded-sm">Add Assets</button>
        <button class="bg-blue-700 hover:bg-blue-800 p-2 my-1 w-32 text-xs text-white rounded-sm">Update to Latest</button>
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

onMounted(async () => {
  const tmpSettings = JSON.parse(localStorage.getItem('panelSettings'))
  if (tmpSettings?.panelType) panelType.value = tmpSettings.panelType
  if (tmpSettings?.connectionKey) connectionKey.value = tmpSettings.connectionKey

  if (!panelSettings.value?.connectionKey || !panelSettings.value?.panelType) toggleSettingsForm()
})

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
      position: 'top-center',
      type: 'info',
      autoClose: true,
    })

    toggleSettingsForm()
  } catch (error) {
    toast(`${error}`, {
      theme: 'dark',
      position: 'top-center',
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

/*

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    let r = false
    s.type = 'text/javascript'
    s.src = src
    s.async = true
    s.onerror = (err) => reject(err, s)
    s.onload = s.onreadystatechange = function () {
      if (!r && (!this.readyState || this.readyState == 'complete')) {
        r = true
        resolve()
      }
    }
    const t = document.getElementsByTagName('script')[0]
    t.parentElement.insertBefore(s, t)
  })
}

const loadImportMap = () => {
  const importMap = {
    imports: {
      'single-spa': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/lib/single-spa/single-spa.min.js`,
      react: `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/lib/single-spa/react/react.production.min.js`,
      'react-dom': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/lib/single-spa/react/react-dom.production.min.js`,
      '@opentext/root-config': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-single-spa/opentext-root-config.js`,
      '@opentext/otmm-collaboration-tool': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-collaboration-tool/opentext-otmm-collaboration-tool.js`,
      '@opentext/otmm-visual-review': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-visual-review/opentext-otmm-visual-review.js`,
      '@opentext/otmm-material-ui': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-material-ui/opentext-otmm-material-ui.js`,
      '@opentext/otmm-asset-browse': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-asset-browse/opentext-otmm-asset-browse.js`,
      '@opentext/otmm-micro-site-root-config': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-micro-site/opentext-otmm-micro-site-root-config.js`,
      '@opentext/otmm-redux': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-redux/opentext-otmm-redux.js`,
      '@opentext/otmm-utils': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-utils/opentext-otmm-utils.js`,
      '@opentext/otmm-inspector-deep-zoom': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-inspector-deep-zoom/opentext-otmm-inspector-deep-zoom.js`,
      '@opentext/otmm-dz-annotator': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-dz-annotator/opentext-otmm-dz-annotator.js`,
      '@opentext/otmm-overrides': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-overrides/opentext-otmm-overrides.js`,
      '@opentext/otmm-i18n': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-i18n/opentext-otmm-i18n.js`,
      '@opentext/otmm-customizations': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-customizations/opentext-otmm-customizations.js`,
      '@opentext/otmm-announcement-panel': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-announcement-panel/opentext-otmm-announcement-panel.js`,
      '@opentext/otmm-login': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-login/opentext-otmm-login.js`,
      '@opentext/otmm-360-spin': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-360-spin/opentext-otmm-360-spin.js`,
      '@opentext/otmm-usage': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-usage/opentext-otmm-usage.js`,
      '@opentext/otmm-products': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-products/opentext-otmm-products.js`,
      '@opentext/otmm-search-bar': `${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/dist_single-spa/otmm-search-bar/opentext-otmm-search-bar.js`,
    },
  }

  const importmap = document.createElement('script')
  importmap.type = 'systemjs-importmap'
  importmap.crossOrigin = 'anonymous'
  importmap.textContent = JSON.stringify(importMap)

  const t = document.getElementsByTagName('script')[0]
  t.parentElement.insertBefore(importmap, t)
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const toggleCodeEntry = () => {
  ssoCode.value = ''
  isValidatingCode.value = !isValidatingCode.value
}

const pasteCode = async () => {
  const tmpCode = await navigator.clipboard.readText()
  ssoCode.value = tmpCode
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const theOpener = window.opener || parent

const sendMessageToPlugin = (message = {}) => (theOpener ? theOpener.postMessage({ ...message }, '*') : '')

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const initializeThePanel = async () => {
  // Set a timer to show the subscription message if there is no connection key after 7 sec
  setTimeout(() => {
    if (!connectionKey.value) showSubscribeMessage.value = true
  }, 7000)

  // Try to get the connection from URL params
  if (window.location.search) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connectionKey')) connectionKey.value = params.get('connectionKey')
    if (params.get('settingsUrl')) settingsUrl = params.get('settingsUrl')
  }
  if (connectionKey.value) return await configurePanel()

  // Otherwise if there is an opener .. set the listener
  if (theOpener) {
    // Setup an page unload handler
    window.onbeforeunload = (e) => sendMessageToPlugin({ type: 'to.plugin.app.closed' })

    // Setup message handler from parent
    const handleMessageFromParent = async (event) => {
      const eventPayload = { ...event.data }

      // console.log(`Got Message`, event)
      const { type } = eventPayload

      if (type == 'from.plugin.info') {
        const { panelInfo } = eventPayload
        if (!panelInfo) return

        if (panelInfo.pluginType) pluginType = panelInfo.pluginType
        if (panelInfo.settingsUrl) settingsUrl = panelInfo.settingsUrl

        if (panelInfo.connectionKey) {
          connectionKey.value = panelInfo.connectionKey
          await configurePanel()
        }

        // console.log('Panel Setup Completed')
        sendMessageToPlugin({ type: 'to.plugin.ready' })
      }

      if (type == 'from.plugin.assets.validate') {
        const { versionIds } = eventPayload

        let verifiedAssets

        if (!otmmApp) {
          toast('Please wait for App to load then try again.', {
            theme: 'dark',
            position: 'top-center',
            type: 'warn',
            autoClose: false,
          })
        } else if (!versionIds || !versionIds.length) {
          toast('No Assets provided to validate.', {
            theme: 'dark',
            position: 'top-center',
            type: 'warn',
            autoClose: false,
          })
        } else {
          verifiedAssets = await verifyAssets(versionIds)
        }

        // console.log(verifiedAssets)
        sendMessageToPlugin({ type: 'to.plugin.assets.validated', assets: verifiedAssets || [] })
      }
    }

    // First remove then add the listener
    window.removeEventListener('message', handleMessageFromParent)
    window.addEventListener('message', handleMessageFromParent)

    // Trigger the plugin to send info to the panel
    sendMessageToPlugin({ type: 'to.plugin.info' })
  }
}

// Watcher for the connection key
watch(connectionKey, (newConnKey) => {
  if (newConnKey) showSubscribeMessage.value = false
})

const configurePanel = async () => {
  try {

    // Loac config from the connection key
    {
      const response = await fetch(`${settingsUrl}/${connectionKey.value}`, { method: 'GET', redirect: 'follow' })
      const result = await response.text()
      window.DXP_PANEL_CONF = JSON.parse(JSON.parse(result))
    } 

    loadImportMap()
    await loadScript(`${DXP_PANEL_CONF.apiBaseUrl}/otmm/ux-html/lib/single-spa/all-in-one-embed.js`)
  } catch (e) {
    showSubscribeMessage.value = true
    return console.error(`ERROR: Cannot load config for the connection key .. ${connectionKey.value}`, e)
  }

  if (['figma', 'canva', 'googleSheets'].includes(pluginType)) {
    delete DXP_PANEL_CONF.CDN_INFO
  }

  // Read session from storage
  session.value = JSON.parse(localStorage.getItem(DXP_PANEL_CONF.sessionKey) || '{}')

  if (!session.value.access_token) return
  if (!session.value.refresh_token) return
  if (!session.value.access_token_expire_at) return

  if (Date.now() > session.value.access_token_expire_at) {
    tryToRefresh().then(() => console.log('token refreshed'))
    // .then(() => loadOtmmWidget({ baseURL: `${DXP_PANEL_CONF.apiBaseUrl}`, otmmAccessToken: `${session.value.access_token}` }))
  }
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

onMounted(async () => await initializeThePanel())

onBeforeUnmount(() => (updateTimeInterval ? clearInterval(updateTimeInterval) : ''))

// Watcher for the session
watch(session, (newSess) => {
  localStorage.setItem(DXP_PANEL_CONF.sessionKey, JSON.stringify(newSess))

  if (newSess && newSess.access_token) {
    if (updateTimeInterval) clearInterval(updateTimeInterval)
    // Set the monitor for the session
    updateTimeInterval = setInterval(() => (theTimer.value = Date.now()), DXP_PANEL_CONF.TOKEN_CHECK_INTERVAL_IN_SEC * 1000)

    // Load the panel
    if (newSess.access_token && newSess.access_token_expire_at && Date.now() < newSess.access_token_expire_at) {
      loadOtmmWidget({ baseURL: `${DXP_PANEL_CONF.apiBaseUrl}`, otmmAccessToken: `${newSess.access_token}` })
    }
  }
})

// Watcher for the timer
watch(theTimer, (newTime) => {
  if (!session.value || !session.value.access_token) {
    console.log(`[ WATCHER ] ${newTime} - No Session exists .. Cancelling Watcher`)
    return updateTimeInterval ? clearInterval(updateTimeInterval) : ''
  }
  if (Date.now() + DXP_PANEL_CONF.TOKEN_CHECK_INTERVAL_IN_SEC * 1000 > session.value.access_token_expire_at) {
    console.log(`[ WATCHER ] ${newTime} -  Need to Refresh`)
    tryToRefresh().then(() => console.log('token refreshed'))
    // .then(() => loadOtmmWidget({ baseURL: `${DXP_PANEL_CONF.apiBaseUrl}`, otmmAccessToken: `${session.value.access_token}` }))
  }
  // else console.log(`${newTime} Session Good!`)
})

// ------ ------ ------ ------ ------ ------ ------ ------ ------

const tryToLogin = () => {
  const fwdUrl = `${DXP_PANEL_CONF.authUrl}?response_type=code&client_id=${DXP_PANEL_CONF.clientId}&redirect_uri=${DXP_PANEL_CONF.redirectUri}`
  // console.log(fwdUrl)
  window.open(fwdUrl, '_blank')
  isValidatingCode.value = true
}

const tryToLogout = () => {
  session.value = {}
}

const tryToRefresh = async () => {
  const headers = new Headers()
  headers.append('Content-Type', 'application/x-www-form-urlencoded')

  const urlencoded = new URLSearchParams()
  {
    urlencoded.append('grant_type', 'refresh_token')
    urlencoded.append('client_id', DXP_PANEL_CONF.clientId)
    urlencoded.append('client_secret', DXP_PANEL_CONF.clientSecret)
    urlencoded.append('refresh_token', session.value.refresh_token)
  }

  try {
    const resp = await fetch(DXP_PANEL_CONF.tokenUrl, {
      method: 'POST',
      headers: headers,
      body: urlencoded,
      redirect: 'follow',
    })
    const tmpSess = await resp.json()
    if (!tmpSess || !tmpSess.access_token) throw '[ REFRESH ] Invalid Token recieved'
    tmpSess.access_token_expire_at = Date.now() + tmpSess.expires_in * 1000
    // console.log(`Got REFRESH Token at ${Date.now()}`, tmpSess)

    session.value = { ...tmpSess }
  } catch (e) {
    console.error('ERROR: While refreshing the token', e)
  }
}

const getTokenForCode = async () => {
  const headers = new Headers()
  headers.append('Content-Type', 'application/x-www-form-urlencoded')

  const urlencoded = new URLSearchParams()
  {
    urlencoded.append('grant_type', 'authorization_code')
    urlencoded.append('client_id', DXP_PANEL_CONF.clientId)
    urlencoded.append('client_secret', DXP_PANEL_CONF.clientSecret)
    urlencoded.append('redirect_uri', DXP_PANEL_CONF.redirectUri)
    urlencoded.append('code', `${ssoCode.value}`)
  }

  try {
    const resp = await fetch(DXP_PANEL_CONF.tokenUrl, {
      method: 'POST',
      headers: headers,
      body: urlencoded,
      redirect: 'follow',
    })
    const tmpSess = await resp.json()
    if (!tmpSess || !tmpSess.access_token) throw 'Invalid Token recieved'
    tmpSess.access_token_expire_at = Date.now() + tmpSess.expires_in * 1000
    // console.log(tmpSess)

    session.value = { ...tmpSess }
    isValidatingCode.value = false
  } catch (e) {
    console.error('ERROR: While getting token for code', e)
  }
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

let otmmApp

const transformOtmmAsset = (a) => {
  const theState = otmmApp.store.getState()
  const theToken = theState.otmm.headers.Authorization.split(' ')[1]
  const renditionServiceUrl = `https://services.dxp.plus/get-rendition`

  {
    const theAsset = a.id != null ? theState.assets.cached[a.id] : { ...a }
    if (!theAsset) return null

    const { name, asset_id, original_asset_id, content_size, rendition_content, date_imported, date_last_updated, master_content_info, content_type: __t } = theAsset

    // Set the preview type based on asset content types
    const previewType = __t == 'BITMAP' ? 'image' : __t == 'VIDEO' ? 'video' : ['MSOFFICE', 'ACROBAT'].includes(__t) ? 'doc' : 'other'

    return {
      objectId: asset_id,
      versionId: original_asset_id,
      filename: name,
      fileSize: content_size,
      previewType,

      previewUrl: `${renditionServiceUrl}/` + `${window.btoa(JSON.stringify({ rendUrl: `${DXP_PANEL_CONF.apiBaseUrl}${rendition_content?.preview_content?.url}`, token: theToken }))}`,
      thumbUrl: `${renditionServiceUrl}/` + `${window.btoa(JSON.stringify({ rendUrl: `${DXP_PANEL_CONF.apiBaseUrl}${rendition_content?.thumbnail_content?.url}`, token: theToken }))}`,

      width: master_content_info?.width,
      height: master_content_info?.height,

      createdAt: Date.parse(date_imported),
      updatedAt: Date.parse(date_last_updated),
      metadata: {},
    }
  }
}

const linkAssetHandler = (promise) => {
  promise.then(async (assets) => {
    // Show a toast
    toast('Placing assets ...', {
      theme: 'dark',
      position: 'top-center',
      type: 'info',
      autoClose: 1000,
      closeOnClick: false,
      pauseOnHover: false,
      pauseOnFocusLoss: false,
    })

    // Transform assets
    assets = assets.map(transformOtmmAsset).filter((a) => a)

    if (DXP_PANEL_CONF.CDN_INFO) {
      // Stage each asset on CDN if info provided
      try {
        showLoading.value = true
        assets = await Promise.all(assets.map((a) => stageThumbAndPreviewToCdn({ asset: a, ...DXP_PANEL_CONF.CDN_INFO })))
      } finally {
        showLoading.value = false
      }
    }

    // console.log(assets)

    sendMessageToPlugin({ type: 'to.plugin.assets.place', assets: assets || [] })

    // Remove the selection
    otmmApp.setSelectedAssets({ currentPager: 'search', selections: [] }, otmmApp.store.dispatch)
  })
}

const loadOtmmWidget = (widgetConf) => {
  let {
    // Required Config
    baseURL,
    otmmAccessToken,
    // Optional
    initialSearchState,
    // Tracking details
    applicationName,
    applicationCategory,
    campaign,
    trackingURL,
    externalTrackingID,
    disableusageTracking,
    assetProfile,
  } = widgetConf

  if (!otmmAccessToken || !baseURL) {
    return alert('Base URL and Access Token are required')
  }

  if (!initialSearchState) {
    initialSearchState = {
      // facetRestrictionList: { "facet_restriction_list": { "facet_field_restriction": [{ "type": "com.artesia.search.facet.FacetSimpleFieldRestriction", "facet_generation_behavior": "EXCLUDE", "field_id": "ARTESIA.FIELD.MIME TYPE", "field_name": "Mime Type", "value_list": ["image/jpeg"] }, { "type": "com.artesia.search.facet.FacetSimpleFieldRestriction", "facet_generation_behavior": "EXCLUDE", "field_id": "ARTESIA.FIELD.TAG", "field_name": "Tag", "value_list": ["Marketing", "Advertising"] }] } },
      keyword: '"test"',
    }
  }

  System.import('@opentext/otmm-redux').then(function (redux) {
    otmmApp = redux

    redux.setApplicationData(
      {
        baseURL,
        headers: { Authorization: `Bearer ${otmmAccessToken}` },

        initialSearchState,

        applicationName, // 'ACME Flyer Designer',
        applicationCategory, // 'Content',
        campaign, // 'Summer 2022',
        trackingURL, // ' www.acmeflyerdesigner.com/cloudedition/?region=south',
        externalTrackingID, // '72382-2982-2',
        disableusageTracking, // true,
        assetProfile, // 'Flyer',

        searchConfigId: 3,
        keywordScopeId: 3,
        withCredentials: false,
        inline: true,
        showDialog: false,
        header: false,
        footer: true,

        hideInlineActions: true,
        hideImportFileButton: true,
        hideInlineImportFileButton: true,

        multiSelect: true,

        linkAsset: {
          handler: linkAssetHandler,
          options: {
            profile: 'DEFAULT', // (optional) The profile name in AMD. The default profile will be used if this value is not specified here.
          },
        },
        removeAsset: {
          handler: (promise) => {
            otmmApp.setSelectedAssets({ currentPager: 'search', selections: [] }, otmmApp.store.dispatch)
            // promise.then((assets) => {
            //  do things with the retrieved assets, for example:
            // })
          },
          options: {},
        },
      },
      redux.store.dispatch,
    )

    System.import('single-spa').then(function (singleSpa) {
      var status = singleSpa.getAppStatus('@opentext/otmm-asset-browse')
      if (status === 'MOUNTED') {
        singleSpa.unloadApplication('@opentext/otmm-asset-browse')
      } else {
        window.otui = {
          SystemSettingsManager: { getSystemSettingValue: () => 3 },
          tr: (val) => val,
        }

        System.import('@opentext/otmm-micro-site-root-config')
      }
    })
  })
}


// ------ ------ ------ ------ ------ ------ ------ ------ ------

const toastPromise = (thePromise, pendingMsg, successMsg, errorMsg) => {
  toast.promise(
    thePromise,
    {
      pending: `${pendingMsg || 'Please wait'}...`,
      success: {
        render(res) {
          if (!res || !res.data || !res.data.message) return successMsg
          else return res.data.message
        },
      },
      error: {
        render(err) {
          if (!err || !err.data || !err.data.message) return errorMsg
          // else return err.data.message
          else return h('div', { class: 'p-2 bg-red-50 text-dxp-primary font-mono text-xs' }, 'Err: ' + err.data.message)
        },
      },
    },
    { theme: 'dark', position: 'top-center', closeOnClick: false, pauseOnHover: false, pauseOnFocusLoss: false },
  )
}

const testNotify = () => {
  toast('Notify called ...', {
    theme: 'dark',
    position: 'top-center',
    closeOnClick: false,
    pauseOnHover: false,
    pauseOnFocusLoss: false,
  })

  // showLoading.value = true

  // const thePromise = new Promise((resolve, reject) => setTimeout(() => reject({ message: 'world' }), 1000))
  // toastPromise(thePromise)

  // thePromise.then(() => { showLoading.value = false }).catch(() => { showLoading.value = false })
}
*/
</script>

<style>
.pnlBtn {
  @apply px-4 py-[.1rem] mx-4 mt-2 cursor-pointer rounded-md leading-6 tracking-wider text-xs text-white bg-blue-900  hover:bg-blue-950;
}

.pnlBtnOutline {
  @apply px-4 py-[.1rem] mx-4 mt-2 cursor-pointer rounded-md leading-6 tracking-wider text-xs border border-blue-950 text-blue-900 hover:text-blue-950;
}
</style>
