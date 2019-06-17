import { getStorage, getService, env } from 'vc-cake'
import React from 'react'
import ReactDOM from 'react-dom'

const { getBlockRegexp, parseDynamicBlock } = getService('utils')
const settingsStorage = getStorage('settings')
const blockRegexp = getBlockRegexp()
const { getParentCount } = getService('cook')

export function getDynamicFieldsData (props, attribute = null, raw = false) {
  const { blockAtts } = props
  const postData = settingsStorage.state('postData').get()
  let key = blockAtts.value.replace('::', ':')
  let result = null
  if (blockAtts && blockAtts.value && typeof postData[ key ] !== 'undefined') {
    if (postData[ key ].length) {
      // Value should be NEVER empty
      result = postData[ key ]
    }
  }

  // In case if type===string and HTML Then:
  if (!raw && attribute && [ 'string', 'htmleditor' ].indexOf(attribute.fieldType) !== -1) {
    const isHtmlAllowed = attribute.fieldOptions.dynamicField === true || (typeof attribute.fieldOptions.dynamicField.html !== 'undefined' && attribute.fieldOptions.dynamicField.html === true)
    if (isHtmlAllowed) {
      if (!result) {
        result = 'No Value'
      }
      return React.createElement('div', {
        className: 'vcvhelper',
        dangerouslySetInnerHTML: {
          __html: result
        },
        'data-vcvs-html': `<!-- wp:vcv-gutenberg-blocks/dynamic-field-block ${JSON.stringify({
          value: blockAtts.value,
          currentValue: result
        })} -->${result}<!-- /wp:vcv-gutenberg-blocks/dynamic-field-block -->`
      })
    }
  }

  // Plain text
  return !result ? `No Value: ${blockAtts.value}` : result
}

export function cleanComments (el, id) {
  const clean = (el, type) => {
    while (el[ type ]) {
      let node = el[ type ]
      if (node.nodeType === document.COMMENT_NODE) {
        let textContent = node.textContent
        if (textContent.indexOf('/dynamicElementComment') !== -1) {
          if (textContent.indexOf(`/dynamicElementComment:${id}`) !== -1) {
            // This is comment of element so we can remove it
            node.remove()
          }
          break
        } else {
          node.remove()
        }
      } else {
        break
      }
    }
  }
  clean(el, 'previousSibling')
  clean(el, 'nextSibling')
}

export function updateDynamicComments (ref, id, cookElement) {
  if (!env('VCV_JS_FT_DYNAMIC_FIELDS')) {
    return
  }
  if (!ref || !cookElement) {
    return
  }
  const el = ReactDOM.findDOMNode(ref)
  // Clean everything before/after
  cleanComments(el, id)

  let atts = cookElement.getAll(false)

  let hasDynamic = false
  let commentStack = []
  let attributesLevel = 0
  Object.keys(atts).forEach((fieldKey) => {
    const attrSettings = cookElement.settings(fieldKey)
    let isDynamic = attrSettings.settings.options &&
      attrSettings.settings.options.dynamicField &&
      typeof atts[ fieldKey ] === 'string' &&
      atts[ fieldKey ].match(blockRegexp)

    if (isDynamic) {
      if (attrSettings.type && attrSettings.type.name && [ 'string', 'htmleditor' ].indexOf(attrSettings.type.name) !== -1) {
        if (attrSettings.settings.options.dynamicField === true || attrSettings.settings.options.dynamicField.html === true) {
          // Skip for field that are string+HTML
          return
        }
      }
      let blockInfo = parseDynamicBlock(atts[ fieldKey ])
      blockInfo.blockAtts.elementId = id
      if (typeof blockInfo.blockAtts.currentValue !== 'undefined') {
        blockInfo.blockAtts.currentValue = getDynamicFieldsData(blockInfo, {
          fieldKey: fieldKey,
          fieldType: attrSettings.type.name,
          fieldOptions: attrSettings.settings.options
        }, true)
      }
      hasDynamic = true
      attributesLevel++
      commentStack.push({ blockInfo, attributesLevel })
    } else if (attrSettings.type && attrSettings.type.name && [ 'designOptions', 'designOptionsAdvanced' ].indexOf(attrSettings.type.name) !== -1) {
      let designOptions = atts[ fieldKey ]
      if (designOptions && designOptions.device) {
        Object.keys(designOptions.device).forEach((device) => {
          let imgValue = attrSettings.type.name === 'designOptionsAdvanced' ? designOptions.device[ device ].images : designOptions.device[ device ].image
          if (typeof imgValue === 'string' && imgValue.match(blockRegexp)) {
            let blockInfo = parseDynamicBlock(imgValue)
            blockInfo.blockAtts.device = device
            blockInfo.blockAtts.elementId = id
            if (typeof blockInfo.blockAtts.currentValue !== 'undefined') {
              blockInfo.blockAtts.currentValue = getDynamicFieldsData(blockInfo, null, true)
            }
            hasDynamic = true
            attributesLevel++
            commentStack.push({ blockInfo, attributesLevel })
          }
        })
      }
    }
  })
  if (hasDynamic) {
    let nestingLevel = getParentCount(id)
    el.insertAdjacentHTML('beforebegin', `<!-- vcwb/dynamicElementComment:${id} -->`)
    el.insertAdjacentHTML('afterend', `<!-- /vcwb/dynamicElementComment:${id} -->`)
    commentStack.forEach((commentData) => {
      const { blockInfo, attributesLevel } = commentData
      el.insertAdjacentHTML('beforebegin', `<!-- wp:${blockInfo.blockScope}${blockInfo.blockName}-${nestingLevel}-${attributesLevel} ${JSON.stringify(blockInfo.blockAtts)} -->`)
      el.insertAdjacentHTML('afterend', `<!-- /wp:${blockInfo.blockScope}${blockInfo.blockName}-${nestingLevel}-${attributesLevel} -->`)
    })
  }
}

export function getDynamicFieldsList (fieldType) {
  let postFields = settingsStorage.state('postFields').get() || []

  return postFields[ fieldType ] || []
}
