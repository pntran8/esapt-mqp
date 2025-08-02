from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
from sqlglot import diff, parse
from sqlglot.expressions import Expression, Create
from sqlglot.expressions import DataType, DataTypeParam, Literal, ColumnDef, Constraint, PrimaryKey, ForeignKey, PrimaryKeyColumnConstraint

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(level=logging.DEBUG)


@app.route('/', methods=['POST'])
def compare_schemas():

    def compare_attributes(expr, expr2):
        attributes1 = []
        attributes2 = []

        for column in expr.find_all(ColumnDef):
            attributes1.append(column.this.this)
        for column in expr2.find_all(ColumnDef):
            attributes2.append(column.this.this)

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


    def primary_key_checker(expr1):
        primary_keys = []
        for col in expr1.this.expressions:
            if col.args.get("constraints"):
                for cons in col.args["constraints"]:
                    if isinstance(cons.kind, PrimaryKeyColumnConstraint):
                        primary_keys.append(col.name)

        for expr in expr1.this.expressions:
            if isinstance(expr, PrimaryKey):
                for pk in expr.expressions:
                    primary_keys.append(pk.this)

        return primary_keys

    def foreign_key_checker(expr1):
        foreign_keys = []
        for expr in expr1.this.expressions:
            if isinstance(expr, Constraint):
                for constraint in expr.expressions:
                    if isinstance(constraint, ForeignKey):
                        foreign_key = []
                        reference = constraint.args.get('reference')
                        foreign_key.append(reference.this.this.this.this)
                        for iden in reference.this.expressions:
                            foreign_key.append(iden.this)
                        foreign_keys.append(foreign_key)
            elif isinstance(expr, ForeignKey):
                foreign_key = []
                reference = expr.args.get('reference')
                foreign_key.append(reference.this.this.this.this)
                for iden in reference.this.expressions:
                    foreign_key.append(iden.this)
                foreign_keys.append(foreign_key)
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
        table_names = []
        for statement in ast:
            if isinstance(statement, Create):
                table_names.append(statement.this.this)
        return table_names

    def get_create_node_for_table(ast, table_name):
        for statement in ast:
            if isinstance(statement, Create):
                if statement.this.this == table_name:
                    return statement
        return None


    try:
        data = request.get_json()
        schema1_str = data.get("schema1", "")
        schema2_str = data.get("schema2", "")

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

        return jsonify({"diff": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def handler(environ, start_response):
    return app(environ, start_response)