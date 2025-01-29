<template>
  <div class="flex-grow">
    <div v-if="showSubscribeMessage" class="flex flex-row w-96 h-screen m-auto justify-center items-center">
      <img class="w-24 h-auto" src="/logo.jpg" />
      <div class="flex flex-col">
        <div class="mx-4 text-sm text-gray-800">Unable to verify connection details. Please contact support for more information.</div>
      </div>
    </div>

    <div v-else-if="!connectionKey || showLoading" class="text-dxp-primary flex w-full h-screen justify-center items-center">
      <svg class="text-dxp-t-primary animate-spin w-8 h-8" viewBox="0 0 100 101" fill="none">
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          class="fill-gray-200"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          class="fill-gray-800"
        />
      </svg>
      <div class="mx-4 text-sm text-gray-800">Please wait...</div>
    </div>

    <div v-else-if="!isLoggedIn" class="text-dxp-primary flex flex-col w-full h-screen flex-wrap justify-around">
      <div v-if="!isValidatingCode" class="mx-auto text-sm">
        <button class="pnlBtn" @click="tryToLogin">Sign In</button>

        <div class="w-full h-2"></div>

        <button class="pnlBtnOutline" @click="toggleCodeEntry">Use access code</button>
      </div>

      <div v-else class="mx-auto text-sm">
        <div class="w-full mx-4 my-1 text-blue-900">Enter authorization code</div>

        <input v-model="ssoCode" type="password" class="bg-stone-100 rounded-sm mx-4 w-full py-2 px-2 text-dxp-placeholder font-mono text-xs border border-blue-900 outline-0" />

        <div class="w-full h-2"></div>

        <div class="flex-row">
          <button v-if="!ssoCode" class="pnlBtn" @click="pasteCode">Paste</button>
          <button class="pnlBtnOutline" @click="toggleCodeEntry">Cancel</button>
          <button v-if="ssoCode" class="pnlBtn" @click="getTokenForCode">Validate</button>
        </div>

      </div>
    </div>

    <div v-if="isLoggedIn" class="text-dxp-primary flex flex-row w-full justify-end">
      <button class="pnlBtn" @click="tryToLogout">Logout</button>
    </div>

    <div id="otmm-asset-browser" v-show="isLoggedIn && !showLoading" class="w-full h-[calc(100vh-2rem)] relative"></div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, h } from 'vue'

import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

const ssoCode = ref('')
const showSubscribeMessage = ref(false)
const showLoading = ref(false)

const theTimer = ref(Date.now())
let updateTimeInterval

const connectionKey = ref('')
let pluginType = 'generic'
let settingsUrl = 'https://panel-settings.dxp.plus'

const session = ref({})
const isLoggedIn = computed(() => session.value.access_token != null && Date.now() < session.value.access_token_expire_at)

const isValidatingCode = ref(false)

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

// ------ ------ VERIFICATION ------ ------ ------ ------ ------

const verifyAssets = async (versionIds) => {
  if (!versionIds || !versionIds.length) return []

  if (showLoading.value) {
    // toast('Operation pending.', { theme: 'dark', position: 'top-center', type: 'error', autoClose: 1000 })
    return []
  }

  toast('Verifying asset versions ...', {
    theme: 'dark',
    position: 'top-center',
    type: 'info',
    autoClose: 1000,
    closeOnClick: false,
    pauseOnHover: false,
    pauseOnFocusLoss: false,
  })

  try {
    showLoading.value = true

    // Get unique version ids
    versionIds = versionIds.filter((val, idx, ary) => ary.indexOf(val) === idx)
    const vIdList = []
    versionIds.forEach((vId) => {
      vIdList.push({
        type: 'com.artesia.search.SearchScalarCondition',
        metadata_field_id: 'ARTESIA.FIELD.ORIGINAL ASSET ID',
        relational_operator_id: 'ARTESIA.OPERATOR.CHAR.CONTAINS',
        value: vId,
        relational_operator: 'or',
      })
    })
    {
      vIdList[0].relational_operator = 'and'
      vIdList[0].left_paren = '('
      vIdList[vIdList.length - 1].right_paren = ')'
    }

    // Make search conditions
    const otmmSrchConds = {
      search_condition_list: {
        search_condition: [
          /*
          {
            type: 'com.artesia.search.SearchScalarCondition',
            metadata_field_id: 'ARTESIA.FIELD.ASSET NAME',
            relational_operator_id: 'ARTESIA.OPERATOR.CHAR.CONTAINS',
            value: 'IMG_0231.jpg',
          },
          */
          {
            type: 'com.artesia.search.SearchScalarCondition',
            metadata_field_id: 'ARTESIA.FIELD.IS LATEST VERSION',
            relational_operator_id: 'ARTESIA.OPERATOR.CHAR.CONTAINS',
            value: 'Y',
          },
          ...vIdList,
          /*
          {
            type: 'com.artesia.search.SearchScalarCondition',
            metadata_field_id: 'ARTESIA.FIELD.ORIGINAL ASSET ID',
            relational_operator_id: 'ARTESIA.OPERATOR.CHAR.CONTAINS',
            value: '1f7fea3d61282e9192e44db7cedd575a2f156e60',
            relational_operator: 'and',
            left_paren: '(',
          },
          {
            type: 'com.artesia.search.SearchScalarCondition',
            metadata_field_id: 'ARTESIA.FIELD.ORIGINAL ASSET ID',
            relational_operator_id: 'ARTESIA.OPERATOR.CHAR.CONTAINS',
            value: 'f81759670ad6c20930c23db9bd869db2a2f20d16',
            relational_operator: 'or',
            right_paren: ')',
          },
          */
        ],
      },
    }

    // Get the Assets from DAM
    let verifiedAssets = await otmmApp.axios
      .get(`search/text`, {
        params: {
          load_type: 'metadata',
          level_of_detail: 'slim',
          search_config_id: 3,
          search_condition_list: JSON.stringify(otmmSrchConds),
        },
      })
      .then((response) => response.data?.search_result_resource?.asset_list || [])

    // Transform the assets
    verifiedAssets = verifiedAssets.map(transformOtmmAsset).filter((a) => a)

    // Stage each asset on CDN if info provided
    if (DXP_PANEL_CONF.CDN_INFO) {
      toast('Adding verified assets ...', {
        theme: 'dark',
        position: 'top-center',
        type: 'success',
        autoClose: 2000,
        closeOnClick: false,
        pauseOnHover: false,
        pauseOnFocusLoss: false,
      })

      verifiedAssets = await Promise.all(verifiedAssets.map((a) => stageThumbAndPreviewToCdn({ asset: a, ...DXP_PANEL_CONF.CDN_INFO })))
    }

    return verifiedAssets
  } finally {
    showLoading.value = false
  }
}

// ------ ------  CDN Methods ------ ------ ------ ------ ------

const stageThumbAndPreviewToCdn = async ({ asset, domain, followLatest = true, cdnDetails, transformer }) => {
  const __a = { ...asset }

  // Stage the Preview
  try {
    // Get the source content url
    const srcUrl = __a.mezzUrl || __a.previewUrl

    // Define a dest file key
    const destFileKey = `${followLatest ? __a.versionId : __a.objectId}/${__a.filename.replace(/[^a-zA-Z0-9.\-_]/g, '').trim()}_preview`

    // Upload the CDN
    await checkExistingFileAndUploadToCdn({ domain, srcUrl, srcHeaders: {}, destFileKey, cdnDetails })

    // Update the preview url
    __a.previewUrl = `https://${domain}/${destFileKey}`

    // Add the cdnUrl with transformer if given .. based on the preview URL
    if (transformer && transformer[__a.previewType]) {
      __a.cdnUrl = `${transformer[__a.previewType].baseUrl}/${__a.previewUrl}`
    }

    // Adjust the preview and thumb if CDN url is defiend
    if (__a.cdnUrl && __a.cdnUrl.includes('__TRANSFORM_PARAMS__')) {
      __a.thumbUrl = __a.cdnUrl.replace('__TRANSFORM_PARAMS__', 'w=148,f=webp')
      __a.previewUrl = __a.cdnUrl.replace('__TRANSFORM_PARAMS__', 'w=512,f=webp')
    }
  } catch (err) {
    console.error(`Problem in staging the preview .. ${err}`)
  }

  return { ...__a }
}

const checkExistingFileAndUploadToCdn = async ({ domain, srcUrl, srcHeaders = {}, destFileKey, cdnDetails }) => {
  const targetUrl = `https://${domain}/${destFileKey}`

  // Check the existing content for traget url
  let existingContentLength = 0
  try {
    const __resp = await fetch(targetUrl)
    if (__resp && __resp.headers) existingContentLength = __resp.headers.get('Content-Length')
    // console.log(`Existing Content Length: ${existingContentLength}`)
  } catch (e) {
    console.log('Problem in getting existing content ..', e)
  }

  // Get the new content
  const contentResp = await fetch(srcUrl, { headers: srcHeaders })
  const contentLength = contentResp.headers.get('Content-Length')
  // console.log(`New Content Length: ${contentLength}`)

  // Only update content if existing content is not the same size
  if (contentLength != existingContentLength) {
    const { cdnType, cdnSignature } = cdnDetails

    // CDN Type - S3
    if (cdnType === 's3')
      try {
        // Generate pre-signed url for CDN
        const resp = await fetch(`https://services.dxp.plus/generate-urls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cdnSignature, fileKeys: [destFileKey] }),
        })
        if (!resp.ok) throw `Problem in getting signed url for ${destFileKey}`

        // Extract the url
        const { urls } = await resp.json()
        if (!urls || urls.length < 1) throw `No signed url generated for ${destFileKey}`
        const upldUrl = urls[0]
        if (!upldUrl) throw `No upload url available .. for key .. ${destFileKey}`

        // Load the New Content
        const blob = await contentResp.blob()

        // Stage the new content on CDN
        await fetch(upldUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentResp.headers.get('Content-Type') } })
        // console.log('New content updated!!')
      } catch (cdnErr) {
        console.log(`ERROR: Cannot upload to CDN .. ${cdnErr}`)
      }
  } else console.log(`Skip content update for [ ${destFileKey} ] .. same file size already exist.`)
}

// ------ ------ ------ ------ ------ ------ ------ ------ ------

/*
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