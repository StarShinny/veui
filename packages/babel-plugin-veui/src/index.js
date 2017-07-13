import fs from 'fs'
import path from 'path'
import pkgDir from 'pkg-dir'
import { kebabCase, camelCase, pascalCase, getJSON } from './utils'

const COMPONENTS = getJSON(path.resolve(__dirname, '../components.json'))
const COMPONENTS_PATH = 'veui/components/'

export default function (babel) {
  const { types: t } = babel;

  return {
    name: 'veui',
    visitor: {
      ImportDeclaration (path, { opts, file }) {
        let node = path.node
        let src = node.source.value

        let resolvedComponentName = null
        if (src !== 'veui' && src.indexOf(COMPONENTS_PATH) !== 0) {

          // import Button from 'veui/components/Button'
          // import Button from 'veui/components/Button'
          if (src.indexOf(COMPONENTS_PATH) === 0) {
            let componentPath = src.slice(0, COMPONENTS_PATH.length)
            resolvedComponentName = getComponentName(componentPath)
          }
          // cannot resolve when absolute path or current file path isn't available
          else if (src.charAt(0) !== '.' || file.opts.filename === 'unknown') {
            return
          }

          // relative path like './Select/Select'
          else {
            resolvedComponentName = resolveComponent(file.opts.filename, src)
          }
        }

        node.specifiers
          .map(({ type, imported }) => {
            let name
            if (imported) {
              name = imported.name === 'default'
                ? resolvedComponentName          // import { default as Whatever } from './Select' → Select
                                                 // import { default as Whatever } from 'veui/components/Select' → Select
                : isComponentName(imported.name)
                  ? imported.name                // import { Select } from 'veui' → Select
                  : null                         // import { Whatever } from 'veui' → null
            }
            else if (type === 'ImportDefaultSpecifier') {
              name = resolvedComponentName       // import Select from './Select' → null
                                                 // import Select from 'veui/components/Select' → null
                                                 // import Select from 'veui' → null
            }
            return getPeerPath(getModuleName(name, opts.transform), opts.fileName)
          })
          .filter(v => v)
          .forEach(name => {
            path.insertAfter(
              createImportStatement(t, opts.package, opts.path, name)
            );
          })
      }
    }
  };
}

function createImportStatement(t, pack, path, name) {
  return t.importDeclaration(
    [],
    t.stringLiteral(
      path
      ? `${pack}/${path}/${name}`
      : `${pack}/${name}`
    )
  )
}

function getPeerPath (name, template = '${module}.css') {
  if (!name) {
    return null
  }
  return template.replace(/\$\{module\}/g, name)
}

function getModuleName (name, transform = 'kebab-case') {
  if (!name) {
    return false
  }
  switch (transform) {
    case 'kebab-case':
      return kebabCase(name)
    case 'camelCase':
      return camelCase(name)
    case 'PascalCase':
      return pascalCase(name)
    default:
      return name
  }
}

function resolveComponent (file, src) {
  let pkg = pkgDir.sync(src)
  if (!pkg || getJSON(path.join(pkg, 'package.json')).name !== 'veui') {
    return null
  }

  let componentsPath = path.join(pkg, 'components') // runtime
  if (!fs.existsSync(componentsPath)) {
    componentsPath = path.join(pkg, 'src/components') // dev
    if (!fs.existsSync(componentsPath)) {
      return
    }
  }

  let relativePath = path.relative(componentsPath, path.resolve(path.dirname(file), src))
  return getComponentName(relativePath)
}

function getComponentName (componentPath) {
  if (!componentPath) {
    return null
  }
  let component = COMPONENTS.find(({ path }) => {
    return path === componentPath || path.split('.')[0] === componentPath
  })

  return component ? component.name : null
}

function isComponentName (componentName) {
  return !!COMPONENTS.find(({ name }) => name === componentName)
}
