"""Robust, watertight color-separated coaster solids from traced SVG polygons.

Build-time dependency: python -m pip install 'shapely>=2.1,<3'
"""
import json
import sys

from shapely import constrained_delaunay_triangles, make_valid, set_precision, union_all
from shapely.geometry import Polygon

GRID = 0.0001
FLOOR = 3.4
TOP = 4.0


def polygons(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == 'Polygon':
        return [geometry]
    if hasattr(geometry, 'geoms'):
        return [polygon for part in geometry.geoms for polygon in polygons(part)]
    return []


def clean(geometry):
    return set_precision(make_valid(geometry), GRID)


def close_point_contacts(geometry):
    # Adjacent traced contours can meet at one vertex. A 0.02 mm closing
    # removes non-manifold point contacts without a visible change in print.
    return clean(geometry.buffer(0.02, join_style=2).buffer(-0.02, join_style=2))


def as_geometry(parts):
    pieces = []
    for rings in parts:
        if not rings or len(rings[0]) < 4:
            continue
        piece = clean(Polygon(rings[0], rings[1:]))
        pieces.extend(polygons(piece))
    return close_point_contacts(union_all(pieces)) if pieces else Polygon()


def signed_triangle(vertices, z, up):
    a, b, c = [[float(x), float(y), z] for x, y in vertices]
    cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return [a, b, c] if (cross > 0) == up else [a, c, b]


def faces(shape, z, up=True):
    triangles = []
    for polygon in polygons(shape):
        for triangle in constrained_delaunay_triangles(polygon).geoms:
            if triangle.area < GRID * GRID:
                continue
            vertices = list(triangle.exterior.coords)[:3]
            triangles.append(signed_triangle(vertices, z, up))
    return triangles


def walls(shape, bottom, top, reverse=False):
    triangles = []
    for polygon in polygons(shape):
        rings = [polygon.exterior, *polygon.interiors]
        for ring in rings:
            vertices = list(ring.coords)
            for start, end in zip(vertices, vertices[1:]):
                a = [float(start[0]), float(start[1])]
                b = [float(end[0]), float(end[1])]
                if a == b:
                    continue
                pair = [
                    [[*a, bottom], [*b, bottom], [*b, top]],
                    [[*a, bottom], [*b, top], [*a, top]],
                ]
                if reverse:
                    pair = [list(reversed(triangle)) for triangle in pair]
                triangles.extend(pair)
    return triangles


def rings(shape):
    return [[[[round(x, 4), round(y, 4)] for x, y in ring.coords]
             for ring in [polygon.exterior, *polygon.interiors]]
            for polygon in polygons(shape)]


def main():
    payload = json.load(sys.stdin)
    disk = clean(Polygon(payload['disk'][0][0]))
    dark = clean(as_geometry(payload['black']).intersection(disk))
    red = clean(as_geometry(payload['red']).intersection(disk))
    dark = clean(dark.difference(red))
    all_ink = close_point_contacts(dark.union(red))
    exposed_base = clean(disk.difference(all_ink))

    base_tris = (
        faces(exposed_base, TOP)
        + faces(all_ink, FLOOR)
        + walls(all_ink, FLOOR, TOP, reverse=True)
        + walls(disk, 0.0, TOP)
        + faces(disk, 0.0, up=False)
    )
    dark_tris = faces(dark, TOP) + faces(dark, FLOOR, up=False) + walls(dark, FLOOR, TOP)
    red_tris = faces(red, TOP) + faces(red, FLOOR, up=False) + walls(red, FLOOR, TOP)
    json.dump({'baseTris': base_tris, 'blackTris': dark_tris, 'redTris': red_tris,
               'black': rings(dark), 'red': rings(red)}, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
