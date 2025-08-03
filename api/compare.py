import json
from sqlglot import parse
from sqlglot.expressions import (
    Create, ColumnDef, Constraint, PrimaryKey, ForeignKey, PrimaryKeyColumnConstraint
)

def compare_attributes(expr1, expr2):
    attributes1 = [col.this.this for col in expr1.find_all(ColumnDef)]
    attributes2 = [col.this.this for col in expr2.find_all(ColumnDef)]

    only_in_1 = set(attributes1) - set(attributes2)
    only_in_2 = set(attributes2) - set(attributes1)

    results = []
    if not only_in_1 and not only_in_2:
        return "they're the same"
    if only_in_1:
        results.append("only in 1: " + str(only_in_1))
    if only_in_2:
        results.append("only in 2: " + str(only_in_2))
    return results

def primary_key_checker(expr):
    primary_keys = []
    for col in expr.this.expressions:
        if col.args.get("constraints"):
            for cons in col.args["constraints"]:
                if isinstance(cons.kind, PrimaryKeyColumnConstraint):
                    primary_keys.append(col.name)

    for expr_item in expr.this.expressions:
        if isinstance(expr_item, PrimaryKey):
            primary_keys.extend(pk.this for pk in expr_item.expressions)

    return primary_keys

def foreign_key_checker(expr):
    foreign_keys = []
    for item in expr.this.expressions:
        if isinstance(item, Constraint):
            for constraint in item.expressions:
                if isinstance(constraint, ForeignKey):
                    reference = constraint.args.get('reference')
                    fk = [reference.this.this.this.this] + [iden.this for iden in reference.this.expressions]
                    foreign_keys.append(fk)
        elif isinstance(item, ForeignKey):
            reference = item.args.get('reference')
            fk = [reference.this.this.this.this] + [iden.this for iden in reference.this.expressions]
            foreign_keys.append(fk)
    return foreign_keys

def strip_datatypes(ast):
    cleaned = []
    for expr in ast:
        expr_copy = expr.copy()
        for column in expr_copy.find_all(ColumnDef):
            column.set('kind', None)
            column.set('constraints', None)
        cleaned.append(expr_copy)
    return cleaned

def get_table_names(ast):
    return [stmt.this.this for stmt in ast if isinstance(stmt, Create)]

def get_create_node_for_table(ast, table_name):
    for stmt in ast:
        if isinstance(stmt, Create) and stmt.this.this == table_name:
            return stmt
    return None

def compare_schemas_logic(schema1_str, schema2_str):
    """Core schema comparison logic"""
    if not schema1_str or not schema2_str:
        raise ValueError("Both schema1 and schema2 are required")

    ast1 = parse(schema1_str)
    ast2 = parse(schema2_str)

    ast1_clean = strip_datatypes(ast1)
    ast2_clean = strip_datatypes(ast2)

    tables1 = set(get_table_names(ast1_clean))
    tables2 = set(get_table_names(ast2_clean))

    only_in_1 = tables1 - tables2
    only_in_2 = tables2 - tables1
    common_tables = tables1 & tables2

    results = []

    if only_in_1:
        results.append(f"Tables only in schema 1: {only_in_1}")
    if only_in_2:
        results.append(f"Tables only in schema 2: {only_in_2}")
    if not common_tables:
        results.append("No common tables to compare.")
        return results

    for table in common_tables:
        results.append(f"\nComparing table: {table}")

        table_clean_1 = get_create_node_for_table(ast1_clean, table)
        table_clean_2 = get_create_node_for_table(ast2_clean, table)

        table_orig_1 = get_create_node_for_table(ast1, table)
        table_orig_2 = get_create_node_for_table(ast2, table)

        attr_diff = compare_attributes(table_clean_1, table_clean_2)
        results.append(f"Attribute differences: {attr_diff}")

        pk1 = primary_key_checker(table_orig_1)
        pk2 = primary_key_checker(table_orig_2)
        if set(pk1) == set(pk2):
            results.append("Primary keys are the same")
        else:
            results.append(f"Primary key mismatch:\n  schema1: {pk1}\n  schema2: {pk2}")

        fk1 = foreign_key_checker(table_orig_1)
        fk2 = foreign_key_checker(table_orig_2)
        if set(tuple(fk) for fk in fk1) == set(tuple(fk) for fk in fk2):
            results.append("Foreign keys are the same")
        else:
            results.append(f"Foreign key differences:\n  schema1: {fk1}\n  schema2: {fk2}")

    return results

# Vercel serverless function handler
def handler(request, context):
    """Vercel serverless function entry point"""
    try:
        # Handle CORS preflight requests
        if request.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': ''
            }

        # Only allow POST requests
        if request.get('httpMethod') != 'POST':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({"error": "Method not allowed"})
            }

        # Parse request body
        body = request.get('body', '')
        if request.get('isBase64Encoded', False):
            import base64
            body = base64.b64decode(body).decode('utf-8')

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({"error": "Invalid JSON"})
            }

        schema1_str = data.get("schema1", "")
        schema2_str = data.get("schema2", "")

        # Run the comparison logic
        results = compare_schemas_logic(schema1_str, schema2_str)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({"diff": results})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"error": str(e)})
        }