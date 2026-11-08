def classFactory(iface):
    from .plugin import VakuPlugin
    return VakuPlugin(iface)
