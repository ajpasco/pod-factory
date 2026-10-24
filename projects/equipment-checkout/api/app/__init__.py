"""The Shared Equipment Checkout API package.

Deliberately empty of imports. ``app.rules`` is imported by the unit tree with
no database and no driver in reach, and anything imported here would be pulled
in with it. The two modules S1 delivers are:

- ``app.rules`` -- the types, the typed errors and the decisions (blueprint 12.5)
- ``app.db``    -- the schema, the engine, the session factory and the seed
                   (blueprint 7 and 12.6)

``app.config``, ``app.routes`` and ``app.main`` belong to S2 and are absent here.
"""
