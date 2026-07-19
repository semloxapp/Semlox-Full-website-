export const AWB_ENTITY_TYPE_MAP: Readonly<
  Record<string, { readonly key: string; readonly label: string }>
> = {
  Airport_of_Departure: { key: "origin_airport", label: "Origin Airport" },
  airport_of_destination: { key: "destination_airport", label: "Destination Airport" },
  House_Airwaybill: { key: "awb_number", label: "AWB Number" },
  Reference_number: { key: "reference_number", label: "Reference Number" },
  Shippers_Name_and_Address: { key: "shipper_name_address", label: "Shipper Name and Address" },
  Consignee_Name_and_Address: { key: "consignee_name_address", label: "Consignee Name and Address" },
  Issued_by: { key: "issuing_carrier", label: "Issuing Carrier" },
  date: { key: "executed_on_date", label: "Executed on Date" },
  number_of_pieces: { key: "pieces", label: "Pieces" },
  pieces_line: { key: "pieces_line", label: "Pieces Line" },
  gross_weight: { key: "gross_weight", label: "Gross Weight" },
  weight_line: { key: "weight_line", label: "Weight Line" },
  chargeable_weight: { key: "chargeable_weight", label: "Chargeable Weight" },
  weight_unit_kg_lb: { key: "weight_unit", label: "Weight Unit" },
  handling_information: { key: "handling_information", label: "Handling Information" },
  nature_and_quantity_goods_discription: {
    key: "nature_and_quantity_of_goods",
    label: "Nature and Quantity of Goods",
  },
  nature_and_quantity_goods_dimensions_or_volume: {
    key: "goods_dimensions_or_volume",
    label: "Goods Dimensions / Volume",
  },
};

export const CURRENT_AWB_FIELD_DEFINITIONS = Object.values(AWB_ENTITY_TYPE_MAP);
export const CURRENT_AWB_FIELD_KEYS: ReadonlySet<string> = new Set(
  CURRENT_AWB_FIELD_DEFINITIONS.map((field) => field.key)
);

export const REQUIRED_AWB_FIELD_KEYS = [
  "awb_number",
  "shipper_name_address",
  "consignee_name_address",
  "origin_airport",
  "destination_airport",
  "issuing_carrier",
  "pieces",
  "gross_weight",
  "chargeable_weight",
  "weight_unit",
  "nature_and_quantity_of_goods",
] as const;

export function isCurrentAwbFieldKey(fieldKey: string) {
  return CURRENT_AWB_FIELD_KEYS.has(fieldKey);
}
