import vcCake from 'vc-cake'
import $ from 'jquery'
import React from 'react'

const dataProcessor = vcCake.getService('dataProcessor')
const DocumentData = vcCake.getService('document')
const assetsManager = vcCake.getService('assetsManager')
const wipAssetsStorage = vcCake.getService('wipAssetsStorage')
const wipStylesManager = vcCake.getService('wipStylesManager')
const myTemplates = vcCake.getService('myTemplates')
const utils = vcCake.getService('utils')
class SaveController {
  constructor (props) {
    this.props = props
    this.props.api.reply('wordpress:save', (options) => {
      this.props.api.request('wordpress:beforeSave', {
        pageElements: DocumentData.all()
      })
      options = $.extend({}, {
        elements: DocumentData.all()
      }, options)
      this.save(options)
    })

    this.props.api.reply('wordpress:load', this.load)
  }

  ajax (data, successCallback, failureCallback) {
    dataProcessor.appAllDone().then(() => {
      dataProcessor.appServerRequest(data).then(successCallback, failureCallback)
    })
  }

  save (data) {
    const iframe = document.getElementById('vcv-editor-iframe')
    const contentLayout = iframe ? iframe.contentWindow.document.querySelector('[data-vcv-module="content-layout"]') : false
    let content = contentLayout ? utils.normalizeHtml(contentLayout.innerHTML) : ''
    let globalStyles = ''
    let designOptions = ''
    let promises = []
    let elements = wipAssetsStorage.getElements()
    let globalStylesManager = wipStylesManager.create()
    globalStylesManager.add(wipAssetsStorage.getSiteCssData())
    promises.push(globalStylesManager.compile().then((result) => {
      globalStyles = result
    }))
    let localStylesManager = wipStylesManager.create()
    localStylesManager.add(wipAssetsStorage.getPageCssData())
    promises.push(localStylesManager.compile().then((result) => {
      designOptions = result
    }))
    Promise.all(promises).then(() => {
      this.ajax(
        {
          'vcv-action': 'setData:adminNonce',
          'vcv-content': content,
          'vcv-data': encodeURIComponent(JSON.stringify(data)),
          'vcv-scripts': JSON.stringify(assetsManager.getJsFilesByTags(wipAssetsStorage.getElementsTagsList())),
          'vcv-shared-library-styles': JSON.stringify(assetsManager.getCssFilesByTags(wipAssetsStorage.getElementsTagsList())),
          'vcv-global-styles': globalStyles,
          // 'vcv-styles': JSON.stringify(styles),
          'vcv-design-options': designOptions,
          'vcv-global-elements': encodeURIComponent(JSON.stringify(elements)),
          'vcv-custom-css': wipAssetsStorage.getCustomCss(),
          'vcv-global-css': wipAssetsStorage.getGlobalCss(),
          'vcv-google-fonts': JSON.stringify(wipAssetsStorage.getGoogleFontsData()),
          'vcv-my-templates': JSON.stringify(myTemplates.all())
        },
        this.saveSuccess.bind(this),
        this.saveFailed.bind(this)
      )
    })
  }

  saveSuccess (responseText) {
    let data = JSON.parse(responseText || '{}')
    if (data.postData) {
      window.vcvPostData = data.postData
    }

    this.props.api.request('wordpress:data:saved', {
      status: 'success',
      request: responseText
    })
  }

  saveFailed (request) {
    this.props.api.request('wordpress:data:saved', {
      status: 'failed',
      request: request
    })
  }

  load = (data) => {
    this.ajax(
      {
        'vcv-action': 'getData:adminNonce',
        'vcv-data': encodeURIComponent(JSON.stringify(data))
      },
      this.loadSuccess.bind(this),
      this.loadFailed.bind(this)
    )
  }

  loadSuccess = (request) => {
    this.props.api.request('wordpress:data:loaded', {
      status: 'success',
      request: request
    })
  }

  loadFailed = (request) => {
    this.props.api.request('wordpress:data:loaded', {
      status: 'failed',
      request: request
    })
  }
}
SaveController.propTypes = {
  api: React.PropTypes.object.isRequired
}

export default SaveController
