import { el } from '../../mount.js';

export function renderSidebarFooter(config, state) {
  return el('div.sidebar-footer', {}, [
    // Version
    config.content.version ? el('div', {
      style: {
        marginBottom: '0.5rem',
        textAlign: 'center',
        fontWeight: '500'
      }
    }, config.content.version) : null,
    
    // Links
    config.content.links && config.content.links.length > 0 ?
    el('div', {
      style: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, config.content.links.map(link =>
      el('a', {
        href: link.href,
        target: link.target || '_self',
        style: {
          color: 'inherit',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }
      }, [
        link.icon ? el('span', {}, link.icon) : null,
        el('span', {}, link.label)
      ].filter(Boolean))
    )) :
    null
  ].filter(Boolean));
}