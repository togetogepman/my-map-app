# pip install geopandas shapely pyproj
import argparse
import pathlib
import warnings
from typing import List

import geopandas as gpd
from shapely.geometry import LineString, MultiPoint, Point
from shapely.ops import snap, unary_union

# Suppress the specific UserWarning from pyproj
warnings.filterwarnings(
    "ignore",
    message="You will likely lose important projection information when converting to a PROJ string from a CRS object.",
    category=UserWarning,
)


def extract_intersections(
    input_path: pathlib.Path, output_path: pathlib.Path, snap_tolerance: float
) -> None:
    """
    Finds branching-point intersections (degree >= 3) in a LineString-only
    GeoJSON and writes them to a new GeoJSON file.

    Args:
        input_path: Path to the input GeoJSON file.
        output_path: Path to write the output GeoJSON file.
        snap_tolerance: The tolerance in meters for snapping vertices.
    """
    try:
        # 1. Read input with GeoPandas.
        gdf = gpd.read_file(input_path)
        if gdf.empty:
            print("Input file is empty or contains no valid geometries.")
            return
        
        initial_feature_count = len(gdf)
        print(f"Read {initial_feature_count} features from '{input_path}'.")

        # Filter for LineString geometries
        gdf = gdf[gdf.geometry.type == "LineString"]
        if gdf.empty:
            print("No LineString features found in the input file.")
            return

        # 2. Ensure CRS is EPSG:4326; re-project if not.
        if gdf.crs is None:
            print("Warning: Input CRS is not set. Assuming EPSG:4326.")
            gdf.set_crs("EPSG:4326", inplace=True)
        elif gdf.crs.to_epsg() != 4326:
            print(f"Re-projecting from EPSG:{gdf.crs.to_epsg()} to EPSG:4326.")
            gdf = gdf.to_crs("EPSG:4326")

        # 3. Merge all LineStrings.
        # The unary_union of all lines in the GeoDataFrame
        merged_lines = unary_union(gdf.geometry)

        # 4. Snap vertices within the specified tolerance.
        # To perform a snap in meters, we need a projected CRS.
        # We use a local UTM zone for accuracy.
        utm_crs = gdf.estimate_utm_crs()
        merged_lines_utm = gpd.GeoSeries([merged_lines], crs="EPSG:4326").to_crs(utm_crs)
        
        # Snap the geometry in the projected CRS
        snapped_geom_utm = snap(
            merged_lines_utm.iloc[0], merged_lines_utm.iloc[0], snap_tolerance
        )

        # Convert back to EPSG:4326
        snapped_geom = gpd.GeoSeries([snapped_geom_utm], crs=utm_crs).to_crs("EPSG:4326").iloc[0]

        # 5. Extract all coordinates from the snapped geometry
        all_coords = []
        if snapped_geom.geom_type == "LineString":
            all_coords.extend(snapped_geom.coords)
        elif snapped_geom.geom_type in ["MultiLineString", "GeometryCollection"]:
            for line in snapped_geom.geoms:
                 if line.geom_type == "LineString":
                    all_coords.extend(line.coords)

        if not all_coords:
            print("No coordinates found after processing.")
            return

        # 6. Count vertex degree; keep those with degree >= 3.
        # Find all unique points (vertices)
        unique_points = MultiPoint([Point(p) for p in set(all_coords)])
        
        # Count occurrences of each coordinate
        coord_counts = {}
        for coord in all_coords:
            coord_counts[coord] = coord_counts.get(coord, 0) + 1
            
        intersections = [
            point for point, count in coord_counts.items() if count >= 3
        ]

        if not intersections:
            print("No intersections with degree >= 3 found.")
            return

        # Create a GeoDataFrame for the intersections
        intersections_gdf = gpd.GeoDataFrame(
            geometry=[Point(p) for p in intersections], crs="EPSG:4326"
        )

        # 7. Write result GeoJSON to the output path.
        intersections_gdf.to_file(output_path, driver="GeoJSON")

        # 8. Print summary.
        print(f"\nProcessing Summary:")
        print(f"  - Input features: {initial_feature_count}")
        print(f"  - Intersections found (degree >= 3): {len(intersections_gdf)}")
        print(f"  - Output written to: '{output_path}'")

    except Exception as e:
        print(f"An error occurred: {e}")


def main():
    """Main function to parse arguments and run the script."""
    parser = argparse.ArgumentParser(
        description="Finds branching-point intersections in a LineString GeoJSON."
    )
    parser.add_argument(
        "--in",
        dest="input_path",
        type=pathlib.Path,
        required=True,
        help="Required: Path to the input GeoJSON file.",
    )
    parser.add_argument(
        "--out",
        dest="output_path",
        type=pathlib.Path,
        default="intersections.geojson",
        help="Optional: Path for the output GeoJSON file (default: intersections.geojson).",
    )
    parser.add_argument(
        "--snap",
        dest="snap_tolerance",
        type=float,
        default=1.0,
        help="Optional: Snapping tolerance in meters (default: 1.0).",
    )

    args = parser.parse_args()

    if not args.input_path.is_file():
        print(f"Error: Input file not found at '{args.input_path}'")
        return

    extract_intersections(args.input_path, args.output_path, args.snap_tolerance)


if __name__ == "__main__":
    main()
